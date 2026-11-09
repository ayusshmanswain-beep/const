// ==============================================================================
// ATTENDANCE MODULE TYPES
// ==============================================================================

import type {
  AttendanceSessionStatus,
  AttendanceVerificationStatus,
  DbAttendanceEvent,
  DbAttendanceSession,
  DbEmployee,
  DbShift,
  PunchSource,
  VerificationMethod,
} from "../../db/types";
import type { SiteWithDetails } from "../site/site.types";

export interface CheckInPunchInput {
  siteId: string;
  latitude: number;
  longitude: number;
  gpsAccuracyMeters: number;
  isMockLocation?: boolean;
  photoUrl?: string;
  qrCodeHash?: string;
  deviceId?: string;
  deviceModel?: string;
  appVersion?: string;
  idempotencyKey: string;
  workerType?: "EMPLOYEE" | "LABOURER";
  workerId?: string; // If supervisor recording for labourer; else resolves from auth context
}

export interface CheckOutPunchInput {
  sessionId?: string;
  siteId: string;
  latitude: number;
  longitude: number;
  gpsAccuracyMeters: number;
  isMockLocation?: boolean;
  deviceId?: string;
  deviceModel?: string;
  appVersion?: string;
  idempotencyKey: string;
}

export interface AttendancePunchResult {
  success: boolean;
  status: "VERIFIED" | "FLAGGED_OUTSIDE" | "FLAGGED_ACCURACY" | "REJECTED";
  sessionId: string;
  eventId: string;
  eventType: "CLOCK_IN" | "CLOCK_OUT";
  siteId: string;
  siteName: string;
  calculatedDistanceMeters: number;
  configuredRadiusSnapshotMeters: number;
  gpsAccuracyMeters: number;
  serverTimestamp: string;
  isInsideGeofence: boolean;
  isLate?: boolean;
  isEarlyCheckout?: boolean;
  totalDurationMinutes?: number;
  overtimeMinutes?: number;
  requiresSupervisorApproval?: boolean;
  riskSignals?: string[];
  message: string;
}

export interface ExceptionReviewInput {
  sessionId: string;
  decision: "APPROVED" | "REJECTED";
  comments?: string;
}

export interface QueryAttendanceParams {
  page?: number;
  limit?: number;
  siteId?: string;
  employeeId?: string;
  workerType?: "EMPLOYEE" | "LABOURER";
  startDate?: string;
  endDate?: string;
  status?: AttendanceSessionStatus;
  verificationStatus?: AttendanceVerificationStatus;
}

export interface AttendanceStatusResponse {
  isCheckedIn: boolean;
  activeSession: DbAttendanceSession | null;
  assignedSites: SiteWithDetails[];
  currentShift: DbShift | null;
  todayEvents: DbAttendanceEvent[];
  employee: DbEmployee | null;
}
