// ==============================================================================
// ATTENDANCE REPOSITORY
// Atomic Transactional Storage for PostGIS Geofence Sessions & Telemetry Logs
// ==============================================================================

import { randomUUID } from "node:crypto";
import { db } from "../../db/client";
import type {
  AttendanceSessionStatus,
  AttendanceVerificationStatus,
  DbAttendanceApproval,
  DbAttendanceEvent,
  DbAttendanceSession,
  DbLocationEvent,
  DbShift,
} from "../../db/types";
import type { QueryAttendanceParams } from "./attendance.types";

export class AttendanceRepository {
  public async findSessionById(id: string): Promise<DbAttendanceSession | null> {
    const store = db.getStore();
    return store.attendanceSessions.get(id) || null;
  }

  public async findActiveSession(
    companyId: string,
    workerType: "EMPLOYEE" | "LABOURER",
    workerId: string,
    sessionDate: string
  ): Promise<DbAttendanceSession | null> {
    const store = db.getStore();
    for (const s of store.attendanceSessions.values()) {
      const matchWorker =
        workerType === "EMPLOYEE" ? s.employeeId === workerId : s.labourerId === workerId;

      if (
        s.companyId === companyId &&
        matchWorker &&
        s.sessionDate === sessionDate &&
        s.firstClockIn &&
        !s.lastClockOut
      ) {
        return s;
      }
    }
    return null;
  }

  public async findSessionByDate(
    companyId: string,
    workerType: "EMPLOYEE" | "LABOURER",
    workerId: string,
    sessionDate: string
  ): Promise<DbAttendanceSession | null> {
    const store = db.getStore();
    for (const s of store.attendanceSessions.values()) {
      const matchWorker =
        workerType === "EMPLOYEE" ? s.employeeId === workerId : s.labourerId === workerId;

      if (s.companyId === companyId && matchWorker && s.sessionDate === sessionDate) {
        return s;
      }
    }
    return null;
  }

  public async findEventByIdempotencyKey(key: string): Promise<DbAttendanceEvent | null> {
    const store = db.getStore();
    for (const ev of store.attendanceEvents.values()) {
      if (ev.idempotencyKey && ev.idempotencyKey === key) {
        return ev;
      }
    }
    return null;
  }

  public async findPreviousEvent(
    companyId: string,
    workerType: "EMPLOYEE" | "LABOURER",
    workerId: string
  ): Promise<DbAttendanceEvent | null> {
    const store = db.getStore();
    const workerEvents = Array.from(store.attendanceEvents.values())
      .filter((ev) => {
        const matchWorker =
          workerType === "EMPLOYEE" ? ev.employeeId === workerId : ev.labourerId === workerId;
        return ev.companyId === companyId && matchWorker && ev.verificationResult === "PASSED";
      })
      .sort((a, b) => b.eventTimestamp.getTime() - a.eventTimestamp.getTime());

    return workerEvents[0] || null;
  }

  public async createCheckInSession(params: {
    companyId: string;
    projectId: string;
    siteId: string;
    shiftId?: string | null;
    geofenceId?: string | null;
    workerType: "EMPLOYEE" | "LABOURER";
    workerId: string;
    sessionDate: string;
    serverTimestamp: Date;
    verificationStatus: AttendanceVerificationStatus;
    approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
    sessionStatus: AttendanceSessionStatus;
    latitude: number;
    longitude: number;
    gpsAccuracyMeters: number;
    calculatedDistanceMeters: number;
    configuredRadiusSnapshotMeters: number;
    isInsideGeofence: boolean;
    isMockLocation: boolean;
    photoUrl?: string;
    qrCodeHash?: string;
    deviceId?: string;
    deviceModel?: string;
    appVersion?: string;
    idempotencyKey: string;
    notes?: string;
  }): Promise<{ session: DbAttendanceSession; event: DbAttendanceEvent }> {
    return db.transaction(async (store) => {
      const sessionId = randomUUID();
      const eventId = randomUUID();
      const locationEventId = randomUUID();

      const session: DbAttendanceSession = {
        id: sessionId,
        companyId: params.companyId,
        projectId: params.projectId,
        siteId: params.siteId,
        shiftId: params.shiftId || null,
        workerType: params.workerType,
        employeeId: params.workerType === "EMPLOYEE" ? params.workerId : null,
        labourerId: params.workerType === "LABOURER" ? params.workerId : null,
        sessionDate: params.sessionDate,
        firstClockIn: params.serverTimestamp,
        lastClockOut: null,
        totalDurationMinutes: 0,
        regularMinutes: 0,
        overtimeMinutes: 0,
        breakDurationMinutes: 0,
        status: params.sessionStatus,
        verificationStatus: params.verificationStatus,
        approvalStatus: params.approvalStatus,
        approvedById: null,
        approvedAt: null,
        remarks: params.notes || null,
        createdAt: params.serverTimestamp,
        updatedAt: params.serverTimestamp,
      };

      store.attendanceSessions.set(session.id, session);

      const event: DbAttendanceEvent = {
        id: eventId,
        companyId: params.companyId,
        sessionId: session.id,
        projectId: params.projectId,
        siteId: params.siteId,
        geofenceId: params.geofenceId || null,
        workerType: params.workerType,
        employeeId: params.workerType === "EMPLOYEE" ? params.workerId : null,
        labourerId: params.workerType === "LABOURER" ? params.workerId : null,
        eventType: "CLOCK_IN",
        eventTimestamp: params.serverTimestamp,
        serverTimestamp: params.serverTimestamp,
        source: "MOBILE_APP",
        verificationMethod: params.qrCodeHash
          ? "QR_CODE_SCAN"
          : params.photoUrl
          ? "FACE_RECOGNITION"
          : "GEOFENCE_ONLY",
        verificationResult:
          params.verificationStatus === "VERIFIED"
            ? "PASSED"
            : params.verificationStatus === "FLAGGED"
            ? "FLAGGED_OUTSIDE"
            : "FAILED",
        latitude: params.latitude,
        longitude: params.longitude,
        gpsAccuracyMeters: params.gpsAccuracyMeters,
        calculatedDistanceMeters: params.calculatedDistanceMeters,
        configuredRadiusSnapshotMeters: params.configuredRadiusSnapshotMeters,
        isInsideGeofence: params.isInsideGeofence,
        isMockLocation: params.isMockLocation,
        photoUrl: params.photoUrl || null,
        qrCodeHash: params.qrCodeHash || null,
        deviceId: params.deviceId || null,
        deviceModel: params.deviceModel || null,
        appVersion: params.appVersion || null,
        osVersion: null,
        ipAddress: null,
        batteryLevelPct: null,
        notes: params.notes || null,
        idempotencyKey: params.idempotencyKey,
        createdAt: params.serverTimestamp,
      };

      store.attendanceEvents.set(event.id, event);

      // Audit Telemetry Location Event
      const locationEvent: DbLocationEvent = {
        id: locationEventId,
        companyId: params.companyId,
        attendanceEventId: event.id,
        projectId: params.projectId,
        siteId: params.siteId,
        workerType: params.workerType,
        employeeId: params.workerType === "EMPLOYEE" ? params.workerId : null,
        labourerId: params.workerType === "LABOURER" ? params.workerId : null,
        recordedAt: params.serverTimestamp,
        serverTimestamp: params.serverTimestamp,
        latitude: params.latitude,
        longitude: params.longitude,
        accuracyMeters: params.gpsAccuracyMeters,
        speedMps: null,
        headingDegrees: null,
        altitudeMeters: null,
        isMockLocation: params.isMockLocation,
        createdAt: params.serverTimestamp,
      };

      store.locationEvents.set(locationEvent.id, locationEvent);

      return { session, event };
    });
  }

  public async recordCheckOutSession(params: {
    sessionId: string;
    serverTimestamp: Date;
    latitude: number;
    longitude: number;
    gpsAccuracyMeters: number;
    calculatedDistanceMeters: number;
    configuredRadiusSnapshotMeters: number;
    isInsideGeofence: boolean;
    isMockLocation: boolean;
    totalDurationMinutes: number;
    regularMinutes: number;
    overtimeMinutes: number;
    sessionStatus: AttendanceSessionStatus;
    idempotencyKey: string;
    deviceId?: string;
    deviceModel?: string;
    appVersion?: string;
  }): Promise<{ session: DbAttendanceSession; event: DbAttendanceEvent }> {
    return db.transaction(async (store) => {
      const session = store.attendanceSessions.get(params.sessionId);
      if (!session) {
        throw new Error(`Session ${params.sessionId} not found`);
      }

      session.lastClockOut = params.serverTimestamp;
      session.totalDurationMinutes = params.totalDurationMinutes;
      session.regularMinutes = params.regularMinutes;
      session.overtimeMinutes = params.overtimeMinutes;
      session.status = params.sessionStatus;
      session.updatedAt = params.serverTimestamp;

      const eventId = randomUUID();
      const event: DbAttendanceEvent = {
        id: eventId,
        companyId: session.companyId,
        sessionId: session.id,
        projectId: session.projectId,
        siteId: session.siteId,
        geofenceId: null,
        workerType: session.workerType,
        employeeId: session.employeeId,
        labourerId: session.labourerId,
        eventType: "CLOCK_OUT",
        eventTimestamp: params.serverTimestamp,
        serverTimestamp: params.serverTimestamp,
        source: "MOBILE_APP",
        verificationMethod: "GEOFENCE_ONLY",
        verificationResult: params.isInsideGeofence ? "PASSED" : "FLAGGED_OUTSIDE",
        latitude: params.latitude,
        longitude: params.longitude,
        gpsAccuracyMeters: params.gpsAccuracyMeters,
        calculatedDistanceMeters: params.calculatedDistanceMeters,
        configuredRadiusSnapshotMeters: params.configuredRadiusSnapshotMeters,
        isInsideGeofence: params.isInsideGeofence,
        isMockLocation: params.isMockLocation,
        deviceId: params.deviceId || null,
        deviceModel: params.deviceModel || null,
        appVersion: params.appVersion || null,
        idempotencyKey: params.idempotencyKey,
        createdAt: params.serverTimestamp,
      };

      store.attendanceEvents.set(event.id, event);

      // Audit Telemetry Location Event
      store.locationEvents.set(randomUUID(), {
        id: randomUUID(),
        companyId: session.companyId,
        attendanceEventId: event.id,
        projectId: session.projectId,
        siteId: session.siteId,
        workerType: session.workerType,
        employeeId: session.employeeId,
        labourerId: session.labourerId,
        recordedAt: params.serverTimestamp,
        serverTimestamp: params.serverTimestamp,
        latitude: params.latitude,
        longitude: params.longitude,
        accuracyMeters: params.gpsAccuracyMeters,
        isMockLocation: params.isMockLocation,
        createdAt: params.serverTimestamp,
      });

      return { session, event };
    });
  }

  public async recordRejectedAttempt(params: {
    companyId: string;
    projectId: string;
    siteId: string;
    workerType: "EMPLOYEE" | "LABOURER";
    workerId: string;
    eventType: "CLOCK_IN" | "CLOCK_OUT";
    reason: string;
    latitude: number;
    longitude: number;
    gpsAccuracyMeters: number;
    calculatedDistanceMeters: number;
    configuredRadiusSnapshotMeters: number;
    isInsideGeofence: boolean;
    isMockLocation: boolean;
    idempotencyKey?: string;
  }): Promise<DbAttendanceEvent> {
    const store = db.getStore();
    const now = new Date();
    const eventId = randomUUID();

    const event: DbAttendanceEvent = {
      id: eventId,
      companyId: params.companyId,
      sessionId: `rejected_${eventId.slice(0, 8)}`,
      projectId: params.projectId,
      siteId: params.siteId,
      workerType: params.workerType,
      employeeId: params.workerType === "EMPLOYEE" ? params.workerId : null,
      labourerId: params.workerType === "LABOURER" ? params.workerId : null,
      eventType: params.eventType,
      eventTimestamp: now,
      serverTimestamp: now,
      source: "MOBILE_APP",
      verificationMethod: "GEOFENCE_ONLY",
      verificationResult: "FAILED",
      latitude: params.latitude,
      longitude: params.longitude,
      gpsAccuracyMeters: params.gpsAccuracyMeters,
      calculatedDistanceMeters: params.calculatedDistanceMeters,
      configuredRadiusSnapshotMeters: params.configuredRadiusSnapshotMeters,
      isInsideGeofence: params.isInsideGeofence,
      isMockLocation: params.isMockLocation,
      notes: `Rejected: ${params.reason}`,
      idempotencyKey: params.idempotencyKey || null,
      createdAt: now,
    };

    store.attendanceEvents.set(event.id, event);
    return event;
  }

  public async reviewExceptionApproval(params: {
    sessionId: string;
    approverUserId: string;
    decision: "APPROVED" | "REJECTED";
    comments?: string;
    ipAddress?: string;
  }): Promise<DbAttendanceSession> {
    return db.transaction(async (store) => {
      const session = store.attendanceSessions.get(params.sessionId);
      if (!session) {
        throw new Error(`Session ${params.sessionId} not found`);
      }

      const now = new Date();
      session.approvalStatus = params.decision;
      session.approvedById = params.approverUserId;
      session.approvedAt = now;
      session.verificationStatus = params.decision === "APPROVED" ? "VERIFIED" : "REJECTED";
      if (params.decision === "APPROVED" && session.status === "ABSENT") {
        session.status = "PRESENT";
      }
      session.updatedAt = now;

      const approvalId = randomUUID();
      const approval: DbAttendanceApproval = {
        id: approvalId,
        companyId: session.companyId,
        sessionId: session.id,
        approverUserId: params.approverUserId,
        approvalTier: 1,
        status: params.decision,
        comments: params.comments || null,
        ipAddress: params.ipAddress || null,
        digitalSignatureHash: randomUUID(),
        actionTimestamp: now,
        metadata: { previousStatus: session.verificationStatus },
        createdAt: now,
      };

      store.attendanceApprovals.set(approval.id, approval);
      return session;
    });
  }

  public async querySessions(
    companyId: string,
    params: QueryAttendanceParams
  ): Promise<{ data: DbAttendanceSession[]; total: number }> {
    const store = db.getStore();
    let list = Array.from(store.attendanceSessions.values()).filter(
      (s) => s.companyId === companyId
    );

    if (params.siteId) {
      list = list.filter((s) => s.siteId === params.siteId);
    }
    if (params.employeeId) {
      list = list.filter((s) => s.employeeId === params.employeeId);
    }
    if (params.startDate) {
      list = list.filter((s) => s.sessionDate >= params.startDate!);
    }
    if (params.endDate) {
      list = list.filter((s) => s.sessionDate <= params.endDate!);
    }
    if (params.status) {
      list = list.filter((s) => s.status === params.status);
    }
    if (params.verificationStatus) {
      list = list.filter((s) => s.verificationStatus === params.verificationStatus);
    }

    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = list.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const data = list.slice(offset, offset + limit);
    return { data, total };
  }

  public async getTodayEventsForWorker(
    companyId: string,
    workerType: "EMPLOYEE" | "LABOURER",
    workerId: string,
    dateStr: string
  ): Promise<DbAttendanceEvent[]> {
    const store = db.getStore();
    return Array.from(store.attendanceEvents.values())
      .filter((ev) => {
        const matchWorker =
          workerType === "EMPLOYEE" ? ev.employeeId === workerId : ev.labourerId === workerId;
        const evDate = ev.serverTimestamp.toISOString().slice(0, 10);
        return ev.companyId === companyId && matchWorker && evDate === dateStr;
      })
      .sort((a, b) => b.serverTimestamp.getTime() - a.serverTimestamp.getTime());
  }

  public async purgeExpiredLocationEvidence(
    companyId: string,
    retentionDays: number = 90
  ): Promise<number> {
    const store = db.getStore();
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let purgedCount = 0;

    for (const [id, loc] of store.locationEvents.entries()) {
      if (loc.companyId === companyId && loc.recordedAt < cutoff) {
        store.locationEvents.delete(id);
        purgedCount++;
      }
    }

    return purgedCount;
  }
}

export const attendanceRepository = new AttendanceRepository();
