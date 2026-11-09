// ==============================================================================
// ATTENDANCE SERVICE
// Core Enterprise GPS Attendance & Precision PostGIS Geofence Verification Engine
// ==============================================================================

import type { SecurityContext } from "../../auth/context";
import { requireAuth, requirePermission, requireTenant } from "../../auth/guards";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../core/errors/app-error";
import { createPaginationMeta, type PaginationMeta } from "../../core/response/pagination";
import { db } from "../../db/client";
import type {
  AttendanceSessionStatus,
  AttendanceVerificationStatus,
  DbAttendanceEvent,
  DbAttendanceSession,
  DbEmployee,
  DbShift,
} from "../../db/types";
import { auditService } from "../audit/audit.service";
import { GeospatialEngine } from "../geospatial/geospatial.engine";
import { siteRepository, type SiteRepository } from "../site/site.repository";
import type { SiteWithDetails } from "../site/site.types";
import { attendanceRepository, type AttendanceRepository } from "./attendance.repository";
import type {
  AttendancePunchResult,
  AttendanceStatusResponse,
  CheckInPunchInput,
  CheckOutPunchInput,
  ExceptionReviewInput,
  QueryAttendanceParams,
} from "./attendance.types";

export class AttendanceService {
  private readonly repo: AttendanceRepository;
  private readonly siteRepo: SiteRepository;

  constructor(
    repo: AttendanceRepository = attendanceRepository,
    siteRepo: SiteRepository = siteRepository
  ) {
    this.repo = repo;
    this.siteRepo = siteRepo;
  }

  /**
   * Resolves the target worker identity for attendance operations.
   */
  private resolveWorker(
    ctx: SecurityContext,
    workerType: "EMPLOYEE" | "LABOURER" = "EMPLOYEE",
    targetWorkerId?: string
  ): { workerType: "EMPLOYEE" | "LABOURER"; workerId: string; employee?: DbEmployee } {
    const store = db.getStore();

    if (workerType === "LABOURER") {
      if (!targetWorkerId) {
        throw new BadRequestError("targetWorkerId is required when clocking for labourers");
      }
      const labourer = store.labourers.get(targetWorkerId);
      if (!labourer || labourer.companyId !== ctx.companyId) {
        throw new NotFoundError("Labourer", targetWorkerId);
      }
      return { workerType: "LABOURER", workerId: targetWorkerId };
    }

    // Default: Authenticated Employee
    if (targetWorkerId && targetWorkerId !== ctx.user.id) {
      // Supervisor logging for another employee
      requirePermission(ctx, "Create", "attendance");
      const employee = store.employees.get(targetWorkerId);
      if (!employee || employee.companyId !== ctx.companyId) {
        throw new NotFoundError("Employee", targetWorkerId);
      }
      return { workerType: "EMPLOYEE", workerId: employee.id, employee };
    }

    // Find employee linked to current user
    const employee = Array.from(store.employees.values()).find(
      (e) => e.userId === ctx.user.id && e.companyId === ctx.companyId
    );

    if (!employee) {
      throw new ForbiddenError(
        "Current authenticated user is not registered as an employee in this organization"
      );
    }

    return { workerType: "EMPLOYEE", workerId: employee.id, employee };
  }

  /**
   * Primary check-in punch processor.
   * Enforces all 12 enterprise security & geospatial rules.
   */
  public async processCheckIn(
    input: CheckInPunchInput,
    ctx: SecurityContext
  ): Promise<AttendancePunchResult> {
    requireAuth(ctx);
    const store = db.getStore();
    const serverTimestamp = new Date();
    const sessionDate = serverTimestamp.toISOString().slice(0, 10);

    // 1. Idempotency Guard (Prevents double punches from network retries)
    if (input.idempotencyKey) {
      const existingEvent = await this.repo.findEventByIdempotencyKey(input.idempotencyKey);
      if (existingEvent) {
        const session = await this.repo.findSessionById(existingEvent.sessionId);
        const site = store.sites.get(existingEvent.siteId);
        return {
          success: existingEvent.verificationResult === "PASSED",
          status:
            existingEvent.verificationResult === "PASSED"
              ? "VERIFIED"
              : existingEvent.verificationResult === "FLAGGED_OUTSIDE"
              ? "FLAGGED_OUTSIDE"
              : "REJECTED",
          sessionId: existingEvent.sessionId,
          eventId: existingEvent.id,
          eventType: "CLOCK_IN",
          siteId: existingEvent.siteId,
          siteName: site?.name || "Authorized Site",
          calculatedDistanceMeters: existingEvent.calculatedDistanceMeters,
          configuredRadiusSnapshotMeters: existingEvent.configuredRadiusSnapshotMeters,
          gpsAccuracyMeters: existingEvent.gpsAccuracyMeters,
          serverTimestamp: existingEvent.serverTimestamp.toISOString(),
          isInsideGeofence: existingEvent.isInsideGeofence,
          message: "Idempotent response: Attendance punch previously registered",
        };
      }
    }

    // 2. Resolve Worker
    const { workerType, workerId, employee } = this.resolveWorker(
      ctx,
      input.workerType || "EMPLOYEE",
      input.workerId
    );

    // 3. Security Rule: Validate Coordinates Range (-90 to +90, -180 to +180, not Null Island)
    const coordVal = GeospatialEngine.validateCoordinates(input.latitude, input.longitude);
    if (!coordVal.valid) {
      throw new BadRequestError(coordVal.reason || "Invalid GPS coordinates");
    }

    // 4. Security Rule: Retrieve Site independently from database. NEVER accept client radius!
    const site = store.sites.get(input.siteId);
    if (!site || site.companyId !== ctx.companyId) {
      throw new NotFoundError("Site", input.siteId);
    }

    if (site.status === "CLOSED" || site.status === "MAINTENANCE") {
      throw new BadRequestError(`Cannot check in: Site '${site.name}' is currently ${site.status}`);
    }

    // 5. Security Rule: Never trust site IDs without checking active worker assignment!
    const assignment = await this.siteRepo.findActiveWorkerAssignment(
      site.id,
      workerType,
      workerId,
      serverTimestamp
    );

    if (!assignment) {
      // Record rejected attempt for audit trail
      await this.repo.recordRejectedAttempt({
        companyId: ctx.companyId,
        projectId: site.projectId,
        siteId: site.id,
        workerType,
        workerId,
        eventType: "CLOCK_IN",
        reason: "Worker not assigned to this authorized construction site",
        latitude: input.latitude,
        longitude: input.longitude,
        gpsAccuracyMeters: input.gpsAccuracyMeters,
        calculatedDistanceMeters: 0,
        configuredRadiusSnapshotMeters: site.radiusMeters,
        isInsideGeofence: false,
        isMockLocation: Boolean(input.isMockLocation),
        idempotencyKey: input.idempotencyKey,
      });

      throw new ForbiddenError(
        `Attendance rejected: Worker is not actively assigned to site '${site.name}'`
      );
    }

    // 6. Security Rule: Never permit duplicate active attendance sessions
    const activeSession = await this.repo.findActiveSession(
      ctx.companyId,
      workerType,
      workerId,
      sessionDate
    );
    if (activeSession) {
      throw new BadRequestError(
        "Active attendance session already in progress for this worker today. Please clock out first."
      );
    }

    // 7. Security Rule: PostGIS WGS-84 Geodesic Distance Calculation
    const geofenceResult = GeospatialEngine.isInsideCircularGeofence(
      input.latitude,
      input.longitude,
      site.latitude,
      site.longitude,
      site.radiusMeters
    );

    // 8. Security Rule: Validate GPS Accuracy against Database-configured site ceiling
    const maxPermittedAccuracy = site.maxAccuracyMeters || 50.0;
    if (input.gpsAccuracyMeters > maxPermittedAccuracy) {
      await this.repo.recordRejectedAttempt({
        companyId: ctx.companyId,
        projectId: site.projectId,
        siteId: site.id,
        workerType,
        workerId,
        eventType: "CLOCK_IN",
        reason: `GPS accuracy ${input.gpsAccuracyMeters}m exceeds maximum allowed threshold of ${maxPermittedAccuracy}m`,
        latitude: input.latitude,
        longitude: input.longitude,
        gpsAccuracyMeters: input.gpsAccuracyMeters,
        calculatedDistanceMeters: geofenceResult.distanceMeters,
        configuredRadiusSnapshotMeters: site.radiusMeters,
        isInsideGeofence: geofenceResult.isInside,
        isMockLocation: Boolean(input.isMockLocation),
        idempotencyKey: input.idempotencyKey,
      });

      throw new BadRequestError(
        `GPS accuracy (${input.gpsAccuracyMeters}m) is too poor. Maximum permitted accuracy for ${site.name} is ${maxPermittedAccuracy}m. Please step into open sky.`
      );
    }

    // 9. Security Rule: Detect suspicious coordinate patterns and risk signals
    const previousEvent = await this.repo.findPreviousEvent(ctx.companyId, workerType, workerId);
    const riskAssessment = GeospatialEngine.detectLocationRiskSignals(
      {
        latitude: input.latitude,
        longitude: input.longitude,
        gpsAccuracyMeters: input.gpsAccuracyMeters,
        isMockLocation: input.isMockLocation,
        eventTimestamp: serverTimestamp,
      },
      previousEvent
        ? {
            latitude: previousEvent.latitude,
            longitude: previousEvent.longitude,
            eventTimestamp: previousEvent.eventTimestamp,
          }
        : null,
      maxPermittedAccuracy
    );

    // 10. Geofence Boundary Check & Exception Routing
    const activeGeofence = await this.siteRepo.findActiveGeofenceBySiteId(site.id);
    let verificationStatus: AttendanceVerificationStatus = "VERIFIED";
    let approvalStatus: "PENDING" | "APPROVED" | "REJECTED" = "APPROVED";
    let sessionStatus: AttendanceSessionStatus = "PRESENT";
    let requiresSupervisorApproval = false;

    if (!geofenceResult.isInside) {
      // Outside geofence radius
      verificationStatus = "FLAGGED";
      approvalStatus = "PENDING";
      requiresSupervisorApproval = true;
    }

    if (riskAssessment.isSuspicious) {
      verificationStatus = "FLAGGED";
      approvalStatus = "PENDING";
      requiresSupervisorApproval = true;
    }

    // 11. Shift Rules & Grace Period Evaluation
    const shift = Array.from(store.shifts.values()).find((s) => s.companyId === ctx.companyId && s.isActive);
    let isLate = false;

    if (shift) {
      const [startHour, startMin] = shift.startTime.split(":").map(Number);
      const shiftStartTimeToday = new Date(serverTimestamp);
      shiftStartTimeToday.setHours(startHour, startMin, 0, 0);

      const gracePeriodMs = shift.gracePeriodMinutes * 60 * 1000;
      if (serverTimestamp.getTime() > shiftStartTimeToday.getTime() + gracePeriodMs) {
        isLate = true;
      }
    }

    // 12. Create Attendance Session and Immutable Audit Evidence in Database Transaction
    const { session, event } = await this.repo.createCheckInSession({
      companyId: ctx.companyId,
      projectId: site.projectId,
      siteId: site.id,
      shiftId: shift?.id || null,
      geofenceId: activeGeofence?.id || null,
      workerType,
      workerId,
      sessionDate,
      serverTimestamp,
      verificationStatus,
      approvalStatus,
      sessionStatus,
      latitude: input.latitude,
      longitude: input.longitude,
      gpsAccuracyMeters: input.gpsAccuracyMeters,
      calculatedDistanceMeters: geofenceResult.distanceMeters,
      configuredRadiusSnapshotMeters: site.radiusMeters,
      isInsideGeofence: geofenceResult.isInside,
      isMockLocation: Boolean(input.isMockLocation),
      photoUrl: input.photoUrl,
      qrCodeHash: input.qrCodeHash,
      deviceId: input.deviceId,
      deviceModel: input.deviceModel,
      appVersion: input.appVersion,
      idempotencyKey: input.idempotencyKey,
      notes: requiresSupervisorApproval
        ? `Flagged: ${
            !geofenceResult.isInside
              ? `Outside site perimeter by ${geofenceResult.deltaMeters}m. `
              : ""
          }${riskAssessment.riskFactors.join(", ")}`
        : isLate
        ? "Late Check-in past grace period"
        : undefined,
    });

    await auditService.logEvent({
      companyId: ctx.companyId,
      actorUserId: ctx.user.id,
      action: "CLOCK_IN_ATTENDANCE",
      tableName: "attendance_events",
      recordId: event.id,
      newData: {
        sessionId: session.id,
        siteId: site.id,
        distanceMeters: geofenceResult.distanceMeters,
        radiusMeters: site.radiusMeters,
        isInsideGeofence: geofenceResult.isInside,
        accuracyMeters: input.gpsAccuracyMeters,
        verificationStatus,
      },
    });

    return {
      success: true,
      status: verificationStatus === "VERIFIED" ? "VERIFIED" : "FLAGGED_OUTSIDE",
      sessionId: session.id,
      eventId: event.id,
      eventType: "CLOCK_IN",
      siteId: site.id,
      siteName: site.name,
      calculatedDistanceMeters: geofenceResult.distanceMeters,
      configuredRadiusSnapshotMeters: site.radiusMeters,
      gpsAccuracyMeters: input.gpsAccuracyMeters,
      serverTimestamp: serverTimestamp.toISOString(),
      isInsideGeofence: geofenceResult.isInside,
      isLate,
      requiresSupervisorApproval,
      riskSignals: riskAssessment.riskFactors,
      message: geofenceResult.isInside
        ? `Successfully checked in at ${site.name} (${geofenceResult.distanceMeters}m from site center)`
        : `Check-in recorded outside geofence (${geofenceResult.distanceMeters}m > ${site.radiusMeters}m radius). Sent for supervisor approval.`,
    };
  }

  /**
   * Primary check-out punch processor.
   * Applies equivalent precision location verification before updating session.
   */
  public async processCheckOut(
    input: CheckOutPunchInput,
    ctx: SecurityContext
  ): Promise<AttendancePunchResult> {
    requireAuth(ctx);
    const store = db.getStore();
    const serverTimestamp = new Date();
    const sessionDate = serverTimestamp.toISOString().slice(0, 10);

    // 1. Idempotency Guard
    if (input.idempotencyKey) {
      const existing = await this.repo.findEventByIdempotencyKey(input.idempotencyKey);
      if (existing && existing.eventType === "CLOCK_OUT") {
        const site = store.sites.get(existing.siteId);
        return {
          success: existing.verificationResult === "PASSED",
          status: existing.verificationResult === "PASSED" ? "VERIFIED" : "FLAGGED_OUTSIDE",
          sessionId: existing.sessionId,
          eventId: existing.id,
          eventType: "CLOCK_OUT",
          siteId: existing.siteId,
          siteName: site?.name || "Authorized Site",
          calculatedDistanceMeters: existing.calculatedDistanceMeters,
          configuredRadiusSnapshotMeters: existing.configuredRadiusSnapshotMeters,
          gpsAccuracyMeters: existing.gpsAccuracyMeters,
          serverTimestamp: existing.serverTimestamp.toISOString(),
          isInsideGeofence: existing.isInsideGeofence,
          message: "Idempotent response: Check-out punch previously registered",
        };
      }
    }

    // 2. Resolve Worker
    const { workerType, workerId } = this.resolveWorker(ctx, "EMPLOYEE");

    // 3. Locate Active Attendance Session
    let session = input.sessionId ? await this.repo.findSessionById(input.sessionId) : null;
    if (!session) {
      session = await this.repo.findActiveSession(ctx.companyId, workerType, workerId, sessionDate);
    }

    if (!session || !session.firstClockIn || session.lastClockOut) {
      throw new BadRequestError("No active check-in session found to check out from");
    }

    // 4. Validate Coordinates & Retrieve Site
    const coordVal = GeospatialEngine.validateCoordinates(input.latitude, input.longitude);
    if (!coordVal.valid) {
      throw new BadRequestError(coordVal.reason || "Invalid GPS coordinates");
    }

    const site = store.sites.get(session.siteId);
    if (!site) {
      throw new NotFoundError("Site", session.siteId);
    }

    // 5. PostGIS Geodesic Distance Calculation
    const geofenceResult = GeospatialEngine.isInsideCircularGeofence(
      input.latitude,
      input.longitude,
      site.latitude,
      site.longitude,
      site.radiusMeters
    );

    // 6. Accuracy Check
    const maxPermittedAccuracy = site.maxAccuracyMeters || 50.0;
    if (input.gpsAccuracyMeters > maxPermittedAccuracy) {
      throw new BadRequestError(
        `GPS accuracy (${input.gpsAccuracyMeters}m) exceeds site limit (${maxPermittedAccuracy}m)`
      );
    }

    // 7. Calculate Duration, Regular & Overtime Minutes
    const clockInTime = session.firstClockIn.getTime();
    const totalDurationMinutes = Math.max(
      0,
      Math.floor((serverTimestamp.getTime() - clockInTime) / (1000 * 60))
    );

    const shift = session.shiftId ? store.shifts.get(session.shiftId) : undefined;
    const fullDayMinutes = shift?.fullDayThresholdMinutes || 480;

    let regularMinutes = Math.min(totalDurationMinutes, fullDayMinutes);
    let overtimeMinutes = Math.max(0, totalDurationMinutes - fullDayMinutes);

    let sessionStatus: AttendanceSessionStatus = "PRESENT";
    if (totalDurationMinutes < (shift?.halfDayThresholdMinutes || 240)) {
      sessionStatus = "HALF_DAY";
    } else if (overtimeMinutes > 0) {
      sessionStatus = "OVERTIME";
    }

    // 8. Record Check-Out
    const { session: updatedSession, event } = await this.repo.recordCheckOutSession({
      sessionId: session.id,
      serverTimestamp,
      latitude: input.latitude,
      longitude: input.longitude,
      gpsAccuracyMeters: input.gpsAccuracyMeters,
      calculatedDistanceMeters: geofenceResult.distanceMeters,
      configuredRadiusSnapshotMeters: site.radiusMeters,
      isInsideGeofence: geofenceResult.isInside,
      isMockLocation: Boolean(input.isMockLocation),
      totalDurationMinutes,
      regularMinutes,
      overtimeMinutes,
      sessionStatus,
      idempotencyKey: input.idempotencyKey,
      deviceId: input.deviceId,
      deviceModel: input.deviceModel,
      appVersion: input.appVersion,
    });

    await auditService.logEvent({
      companyId: ctx.companyId,
      actorUserId: ctx.user.id,
      action: "CLOCK_OUT_ATTENDANCE",
      tableName: "attendance_events",
      recordId: event.id,
      newData: {
        sessionId: session.id,
        totalDurationMinutes,
        regularMinutes,
        overtimeMinutes,
        distanceMeters: geofenceResult.distanceMeters,
      },
    });

    return {
      success: true,
      status: geofenceResult.isInside ? "VERIFIED" : "FLAGGED_OUTSIDE",
      sessionId: session.id,
      eventId: event.id,
      eventType: "CLOCK_OUT",
      siteId: site.id,
      siteName: site.name,
      calculatedDistanceMeters: geofenceResult.distanceMeters,
      configuredRadiusSnapshotMeters: site.radiusMeters,
      gpsAccuracyMeters: input.gpsAccuracyMeters,
      serverTimestamp: serverTimestamp.toISOString(),
      isInsideGeofence: geofenceResult.isInside,
      totalDurationMinutes,
      overtimeMinutes,
      message: `Successfully checked out from ${site.name}. Total time: ${Math.floor(
        totalDurationMinutes / 60
      )}h ${totalDurationMinutes % 60}m`,
    };
  }

  /**
   * Retrieves today's current status and assigned sites for the logged-in employee.
   */
  public async getAttendanceStatus(ctx: SecurityContext): Promise<AttendanceStatusResponse> {
    requireAuth(ctx);
    const store = db.getStore();
    const today = new Date().toISOString().slice(0, 10);

    const employee = Array.from(store.employees.values()).find(
      (e) => e.userId === ctx.user.id && e.companyId === ctx.companyId
    );

    if (!employee) {
      return {
        isCheckedIn: false,
        activeSession: null,
        assignedSites: [],
        currentShift: null,
        todayEvents: [],
        employee: null,
      };
    }

    const activeSession = await this.repo.findActiveSession(
      ctx.companyId,
      "EMPLOYEE",
      employee.id,
      today
    );

    // Assigned sites
    const assignments = Array.from(store.siteAssignments.values()).filter(
      (a) => a.employeeId === employee.id && a.isActive
    );

    const assignedSites: SiteWithDetails[] = assignments
      .map((a) => {
        const site = store.sites.get(a.siteId);
        if (!site) return null;
        const geofence = Array.from(store.geofences.values()).find(
          (g) => g.siteId === site.id && g.isActive
        );
        const item: SiteWithDetails = {
          ...site,
          activeGeofence: geofence || undefined,
          assignmentsCount: 1,
        };
        return item;
      })
      .filter((s): s is SiteWithDetails => s !== null);

    const shift = Array.from(store.shifts.values()).find(
      (s) => s.companyId === ctx.companyId && s.isActive
    ) || null;

    const todayEvents = await this.repo.getTodayEventsForWorker(
      ctx.companyId,
      "EMPLOYEE",
      employee.id,
      today
    );

    return {
      isCheckedIn: Boolean(activeSession && !activeSession.lastClockOut),
      activeSession,
      assignedSites,
      currentShift: shift,
      todayEvents,
      employee,
    };
  }

  /**
   * Supervisor Exception Approval workflow.
   */
  public async reviewException(
    input: ExceptionReviewInput,
    ctx: SecurityContext
  ): Promise<DbAttendanceSession> {
    requirePermission(ctx, "Approve", "attendance");

    const session = await this.repo.findSessionById(input.sessionId);
    if (!session) {
      throw new NotFoundError("AttendanceSession", input.sessionId);
    }
    requireTenant(ctx, session.companyId);

    const reviewed = await this.repo.reviewExceptionApproval({
      sessionId: input.sessionId,
      approverUserId: ctx.user.id,
      decision: input.decision,
      comments: input.comments,
    });

    await auditService.logEvent({
      companyId: session.companyId,
      actorUserId: ctx.user.id,
      action: "REVIEW_ATTENDANCE_EXCEPTION",
      tableName: "attendance_sessions",
      recordId: session.id,
      newData: {
        decision: input.decision,
        comments: input.comments,
        verificationStatus: reviewed.verificationStatus,
      },
    });

    return reviewed;
  }

  /**
   * Filterable query for sessions.
   */
  public async querySessions(
    params: QueryAttendanceParams,
    ctx: SecurityContext
  ): Promise<{ data: DbAttendanceSession[]; meta: PaginationMeta }> {
    requirePermission(ctx, "View", "attendance");

    const { data, total } = await this.repo.querySessions(ctx.companyId, params);
    const meta = createPaginationMeta(params.page || 1, params.limit || 20, total);
    return { data, meta };
  }

  /**
   * Purges location telemetry beyond retention limit (e.g. 90 days).
   */
  public async enforceDataRetention(
    companyId: string,
    retentionDays: number = 90,
    ctx: SecurityContext
  ): Promise<number> {
    requireTenant(ctx, companyId);
    requirePermission(ctx, "Manage", "attendance");

    const purged = await this.repo.purgeExpiredLocationEvidence(companyId, retentionDays);

    await auditService.logEvent({
      companyId,
      actorUserId: ctx.user.id,
      action: "PURGE_LOCATION_EVIDENCE_RETENTION",
      tableName: "location_events",
      newData: { retentionDays, purgedRecordsCount: purged },
    });

    return purged;
  }
}

export const attendanceService = new AttendanceService();
