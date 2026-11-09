// ==============================================================================
// CONSTRUCT360 DATABASE MODEL TYPES
// ==============================================================================

export interface DbCompany {
  id: string;
  code: string;
  legalName: string;
  tradeName?: string;
  taxId?: string;
  registrationNumber?: string;
  currency: string;
  email: string;
  phone?: string;
  website?: string;
  timezone: string;
  settings: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbBranch {
  id: string;
  companyId: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isHeadquarters: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbUser {
  id: string;
  email: string;
  phoneNumber?: string;
  passwordHash: string;
  fullName: string;
  avatarUrl?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  mfaSecret?: string;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbUserCompanyMembership {
  id: string;
  userId: string;
  companyId: string;
  defaultBranchId?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbUserSession {
  id: string;
  userId: string;
  refreshTokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
}

export interface DbRole {
  id: string;
  companyId?: string | null;
  name: string;
  slug: string;
  description?: string;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbPermission {
  id: string;
  category: string;
  action: "View" | "Create" | "Update" | "Delete" | "Approve" | "Export" | "Manage";
  resource: string;
  code: string; // e.g. "attendance:approve", "companies:manage"
  description?: string;
  createdAt: Date;
}

export interface DbRolePermission {
  roleId: string;
  permissionId: string;
  createdAt: Date;
}

export interface DbUserRole {
  id: string;
  companyId: string;
  userId: string;
  roleId: string;
  projectId?: string | null;
  createdAt: Date;
}

export interface DbAuditLog {
  id: string;
  companyId?: string | null;
  actorUserId?: string | null;
  action: string;
  tableName: string;
  recordId?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  changedFields?: string[];
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

export interface DbNotification {
  id: string;
  companyId: string;
  userId: string;
  title: string;
  message: string;
  channel: "IN_APP" | "EMAIL" | "SMS" | "PUSH";
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  readAt?: Date | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface DbDocument {
  id: string;
  companyId: string;
  projectId?: string | null;
  siteId?: string | null;
  category: string;
  documentCode: string;
  title: string;
  description?: string;
  currentVersion: number;
  storageProvider: string;
  storageKey: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  checksumSha256: string;
  uploadedById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbDocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  storageKey: string;
  fileName: string;
  fileSizeBytes: number;
  checksumSha256: string;
  changeSummary?: string;
  uploadedById: string;
  createdAt: Date;
}

export interface DbPasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

export interface DbUserInvitation {
  id: string;
  email: string;
  companyId: string;
  roleId: string;
  tokenHash: string;
  invitedByUserId: string;
  expiresAt: Date;
  acceptedAt?: Date | null;
  createdAt: Date;
}

// ==============================================================================
// GEOSPATIAL & SITE DOMAIN TYPES
// ==============================================================================

export type SiteStatusType =
  | "PREPARATION"
  | "ACTIVE_CONSTRUCTION"
  | "FINISHING"
  | "HANDOVER"
  | "MAINTENANCE"
  | "CLOSED";

export type GeofenceShapeType = "CIRCULAR" | "POLYGON";
export type AssigneeWorkerType = "EMPLOYEE" | "LABOURER" | "CONTRACTOR";

export interface DbProject {
  id: string;
  companyId: string;
  branchId: string;
  projectCode: string;
  name: string;
  description?: string;
  clientName: string;
  clientContactPerson?: string;
  clientEmail?: string;
  clientPhone?: string;
  projectManagerId?: string;
  contractValue: number;
  budget: number;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
  healthStatus?: "ON_TRACK" | "AT_RISK" | "DELAYED";
  startDate: Date;
  plannedEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  assignedSiteIds?: string[];
  assignedEmployeeIds?: string[];
  assignedLabourerIds?: string[];
  overallProgressPercent?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbSite {
  id: string;
  companyId: string;
  projectId: string;
  siteCode: string;
  name: string;
  description?: string;
  siteEngineerId?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  status: SiteStatusType;
  latitude: number;
  longitude: number;
  radiusMeters: number; // Configured radius coming strictly from database
  maxAccuracyMeters: number; // Maximum acceptable GPS accuracy threshold
  createdAt: Date;
  updatedAt: Date;
}

export interface DbSiteGeofence {
  id: string;
  companyId: string;
  siteId: string;
  name: string;
  geofenceType: GeofenceShapeType;
  centerLatitude?: number | null;
  centerLongitude?: number | null;
  radiusMeters: number;
  polygonCoordinates?: [number, number][]; // [lat, lng] array
  isActive: boolean;
  metadata: {
    maxAccuracyMeters?: number;
    gracePeriodMinutes?: number;
    requireSelfie?: boolean;
    requireQr?: boolean;
    qrSecret?: string;
    [key: string]: unknown;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DbSiteGeofenceHistory {
  id: string;
  companyId: string;
  siteId: string;
  geofenceId: string;
  changedByUserId: string;
  oldRadiusMeters: number;
  newRadiusMeters: number;
  oldCenterLatitude?: number | null;
  newCenterLatitude?: number | null;
  oldCenterLongitude?: number | null;
  newCenterLongitude?: number | null;
  reason: string;
  timestamp: Date;
}

export interface DbSiteAssignment {
  id: string;
  companyId: string;
  siteId: string;
  assigneeType: AssigneeWorkerType;
  employeeId?: string | null;
  labourerId?: string | null;
  contractorId?: string | null;
  roleOnSite?: string | null;
  assignedFrom: Date;
  assignedTo?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==============================================================================
// SHIFTS & WORKFORCE TYPES
// ==============================================================================

export interface DbShift {
  id: string;
  companyId: string;
  code: string;
  name: string;
  startTime: string; // HH:mm:ss format
  endTime: string;   // HH:mm:ss format
  gracePeriodMinutes: number;
  breakDurationMinutes: number;
  halfDayThresholdMinutes: number;
  fullDayThresholdMinutes: number;
  isNightShift: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbShiftRoster {
  id: string;
  companyId: string;
  siteId: string;
  shiftId: string;
  assigneeType: AssigneeWorkerType;
  employeeId?: string | null;
  labourerId?: string | null;
  rosterDate: string; // YYYY-MM-DD
  isOffDay: boolean;
  createdAt: Date;
}

export type EmploymentType =
  | "PERMANENT"
  | "TEMPORARY"
  | "CONTRACTUAL"
  | "PROBATION"
  | "INTERN";

export type LabourTradeType =
  | "MASON"
  | "CARPENTER"
  | "BAR_BENDER"
  | "ELECTRICIAN"
  | "PLUMBER"
  | "PAINTER"
  | "WELDER"
  | "SCAFFOLDER"
  | "EQUIPMENT_OPERATOR"
  | "SURVEY_HELPER"
  | "GENERAL_HELPER"
  | "OTHER";

export type ContractorTypeEnum =
  | "GENERAL"
  | "CIVIL_WORKS"
  | "ELECTRICAL"
  | "PLUMBING"
  | "HVAC"
  | "REBAR"
  | "MASONRY"
  | "LABOUR_SUPPLY";

export interface DbDepartment {
  id: string;
  companyId: string;
  code: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbDesignation {
  id: string;
  companyId: string;
  title: string;
  level: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbEmployee {
  id: string;
  companyId: string;
  branchId?: string | null;
  userId?: string | null;
  departmentId?: string | null;
  designationId?: string | null;
  reportingManagerId?: string | null;
  assignedProjectId?: string | null;
  assignedSiteId?: string | null;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone: string;
  employmentType: EmploymentType;
  status: "ACTIVE" | "PROBATION" | "ON_NOTICE" | "TERMINATED" | "RESIGNED";
  joiningDate: Date;
  exitDate?: Date | null;
  dateOfBirth?: Date | null;
  gender?: string | null;
  maritalStatus?: string | null;
  bloodGroup?: string | null;
  nationality?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  panNumber?: string | null;
  aadhaarNumber?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
  photoUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbEmployeeDocument {
  id: string;
  companyId: string;
  employeeId: string;
  documentType:
    | "ID_PROOF"
    | "ADDRESS_PROOF"
    | "ACADEMIC"
    | "EMPLOYMENT_CONTRACT"
    | "RESUME"
    | "CERTIFICATION";
  title: string;
  fileName: string;
  fileUrl: string;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  verifiedByUserId?: string | null;
  verifiedAt?: Date | null;
  rejectionReason?: string | null;
  createdAt: Date;
}

export interface DbEmployeeHistory {
  id: string;
  companyId: string;
  employeeId: string;
  eventType:
    | "JOINED"
    | "PROMOTION"
    | "DESIGNATION_CHANGE"
    | "DEPARTMENT_TRANSFER"
    | "SITE_TRANSFER"
    | "SALARY_REVISION"
    | "STATUS_CHANGE";
  description: string;
  changedByUserId: string;
  oldValue?: string | null;
  newValue?: string | null;
  effectiveDate: Date;
  createdAt: Date;
}

export interface DbSalaryStructure {
  id: string;
  companyId: string;
  employeeId: string;
  baseSalary: number;
  hra: number;
  conveyanceAllowance: number;
  siteAllowance: number;
  specialAllowance: number;
  pfEmployeePercent: number;
  esiEmployeePercent: number;
  professionalTax: number;
  effectiveFrom: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbLabourer {
  id: string;
  companyId: string;
  contractorId?: string | null;
  labourerCode: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  skillLevel: "UNSKILLED" | "SEMI_SKILLED" | "SKILLED" | "HIGHLY_SKILLED";
  primaryTrade: LabourTradeType;
  dailyWageRate: number;
  hourlyWageRate: number;
  pieceRateWage: number;
  groupName?: string | null;
  availabilityStatus: "AVAILABLE" | "ON_SITE" | "ON_LEAVE" | "INACTIVE";
  currentProjectId?: string | null;
  currentSiteId?: string | null;
  emergencyPhone?: string | null;
  idProofType?: string | null;
  idProofNumber?: string | null;
  photoUrl?: string | null;
  biometricEnrolled: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbLabourWageAdvance {
  id: string;
  companyId: string;
  labourerId: string;
  amount: number;
  requestDate: Date;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DEDUCTED";
  approvedByUserId?: string | null;
  approvedAt?: Date | null;
  deductedFromDate?: Date | null;
  createdAt: Date;
}

export interface DbLabourTransfer {
  id: string;
  companyId: string;
  labourerId: string;
  fromSiteId: string;
  toSiteId: string;
  transferDate: Date;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvedByUserId?: string | null;
  approvedAt?: Date | null;
  createdAt: Date;
}

export interface DbContractor {
  id: string;
  companyId: string;
  contractorCode: string;
  businessName: string;
  contractorType: ContractorTypeEnum;
  contactPerson: string;
  email?: string | null;
  phone: string;
  taxId?: string | null;
  panNumber?: string | null;
  address?: string | null;
  rating: number;
  contractValidFrom: Date;
  contractValidTo: Date;
  contractRates: Record<string, number>;
  agreementDocUrl?: string | null;
  allocatedProjectIds: string[];
  allocatedSiteIds: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbContractorBill {
  id: string;
  companyId: string;
  contractorId: string;
  billNumber: string;
  projectId?: string | null;
  siteId?: string | null;
  periodStartDate: Date;
  periodEndDate: Date;
  mandaysCount: number;
  grossAmount: number;
  deductionsAmount: number;
  netPayable: number;
  paidAmount: number;
  status:
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "APPROVED"
    | "REJECTED"
    | "PAID"
    | "PARTIALLY_PAID";
  submittedDate: Date;
  approvedByUserId?: string | null;
  approvedAt?: Date | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbContractorPayment {
  id: string;
  companyId: string;
  contractorId: string;
  billId: string;
  amount: number;
  paymentDate: Date;
  paymentMode: "BANK_TRANSFER" | "CHEQUE" | "UPI" | "CASH";
  referenceNumber?: string | null;
  notes?: string | null;
  createdAt: Date;
}

export interface DbLeaveType {
  id: string;
  companyId: string;
  code: string;
  name: string;
  annualDaysAllowed: number;
  isCarryForward: boolean;
  createdAt: Date;
}

export interface DbLeaveBalance {
  id: string;
  companyId: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  allocatedDays: number;
  usedDays: number;
  pendingDays: number;
}

export interface DbLeaveRequest {
  id: string;
  companyId: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  daysCount: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  approvedByUserId?: string | null;
  approvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbCompanyAnnouncement {
  id: string;
  companyId: string;
  title: string;
  content: string;
  priority: "NORMAL" | "HIGH" | "URGENT";
  category: string;
  publishedAt: Date;
  authorName: string;
}

// ==============================================================================
// ATTENDANCE & TELEMETRY AUDIT TYPES
// ==============================================================================

export type AttendanceSessionStatus =
  | "PRESENT"
  | "HALF_DAY"
  | "ABSENT"
  | "OVERTIME"
  | "ON_LEAVE"
  | "REGULARIZED";

export type AttendanceVerificationStatus =
  | "VERIFIED"
  | "FLAGGED"
  | "REJECTED"
  | "REQUIRES_APPROVAL";

export type AttendanceEventType =
  | "CLOCK_IN"
  | "CLOCK_OUT"
  | "BREAK_START"
  | "BREAK_END"
  | "SITE_TRANSFER";

export type PunchSource =
  | "MOBILE_APP"
  | "KIOSK_FACIAL"
  | "BIOMETRIC_DEVICE"
  | "SUPERVISOR_PORTAL"
  | "AUTO_CHECKOUT";

export type VerificationMethod =
  | "GEOFENCE_ONLY"
  | "FACE_RECOGNITION"
  | "BIOMETRIC_FINGERPRINT"
  | "QR_CODE_SCAN"
  | "SUPERVISOR_OVERRIDE";

export interface DbAttendanceSession {
  id: string;
  companyId: string;
  projectId: string;
  siteId: string;
  shiftId?: string | null;
  workerType: "EMPLOYEE" | "LABOURER";
  employeeId?: string | null;
  labourerId?: string | null;
  sessionDate: string; // YYYY-MM-DD
  firstClockIn?: Date | null;
  lastClockOut?: Date | null;
  totalDurationMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  breakDurationMinutes: number;
  status: AttendanceSessionStatus;
  verificationStatus: AttendanceVerificationStatus;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  approvedById?: string | null;
  approvedAt?: Date | null;
  remarks?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbAttendanceEvent {
  id: string;
  companyId: string;
  sessionId: string;
  projectId: string;
  siteId: string;
  geofenceId?: string | null;
  workerType: "EMPLOYEE" | "LABOURER";
  employeeId?: string | null;
  labourerId?: string | null;
  eventType: AttendanceEventType;
  eventTimestamp: Date;
  serverTimestamp: Date;
  source: PunchSource;
  verificationMethod: VerificationMethod;
  verificationResult: "PASSED" | "FAILED" | "FLAGGED_ACCURACY" | "FLAGGED_OUTSIDE";
  latitude: number;
  longitude: number;
  gpsAccuracyMeters: number;
  calculatedDistanceMeters: number;
  configuredRadiusSnapshotMeters: number;
  isInsideGeofence: boolean;
  isMockLocation: boolean;
  photoUrl?: string | null;
  qrCodeHash?: string | null;
  deviceId?: string | null;
  deviceModel?: string | null;
  appVersion?: string | null;
  osVersion?: string | null;
  ipAddress?: string | null;
  batteryLevelPct?: number | null;
  notes?: string | null;
  idempotencyKey?: string | null;
  createdAt: Date;
}

export interface DbLocationEvent {
  id: string;
  companyId: string;
  attendanceEventId?: string | null;
  projectId: string;
  siteId: string;
  workerType: "EMPLOYEE" | "LABOURER";
  employeeId?: string | null;
  labourerId?: string | null;
  recordedAt: Date;
  serverTimestamp: Date;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  speedMps?: number | null;
  headingDegrees?: number | null;
  altitudeMeters?: number | null;
  isMockLocation: boolean;
  createdAt: Date;
}

export interface DbAttendanceApproval {
  id: string;
  companyId: string;
  sessionId: string;
  approverUserId: string;
  approvalTier: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  comments?: string | null;
  ipAddress?: string | null;
  digitalSignatureHash?: string | null;
  actionTimestamp: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// ----------------------------------------------------------------------------
// PROJECT MANAGEMENT & PLANNING EXTENSIONS
// ----------------------------------------------------------------------------

export type ProjectDocumentType =
  | "CONTRACT"
  | "ARCHITECTURAL_DRAWING"
  | "STRUCTURAL_DESIGN"
  | "BOQ"
  | "SITE_PERMIT"
  | "SAFETY_PLAN"
  | "PROGRESS_REPORT"
  | "OTHER";

export interface DbProjectDocument {
  id: string;
  companyId: string;
  projectId: string;
  documentType: ProjectDocumentType;
  title: string;
  fileName: string;
  fileUrl: string;
  fileSizeBytes?: number;
  version?: string;
  uploadedByUserId: string;
  createdAt: Date;
}

export interface DbProjectHistory {
  id: string;
  companyId: string;
  projectId: string;
  eventType:
    | "PROJECT_CREATED"
    | "STATUS_CHANGE"
    | "BUDGET_REVISED"
    | "MANAGER_ASSIGNED"
    | "SCHEDULE_REVISED"
    | "MILESTONE_ACHIEVED"
    | "SITE_ASSIGNED"
    | "WORKFORCE_ASSIGNED";
  description: string;
  changedByUserId: string;
  oldValue?: string;
  newValue?: string;
  effectiveDate: Date;
  createdAt: Date;
}

export interface DbWbsNode {
  id: string;
  companyId: string;
  projectId: string;
  wbsCode: string; // e.g. "1.0", "1.1", "2.0"
  name: string;
  description?: string;
  parentWbsId?: string;
  orderIndex: number;
  createdAt: Date;
}

export type TaskPriorityType = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TaskStatusType = "NOT_STARTED" | "IN_PROGRESS" | "UNDER_REVIEW" | "COMPLETED" | "BLOCKED";

export interface DbProjectTask {
  id: string;
  companyId: string;
  projectId: string;
  wbsNodeId?: string;
  parentTaskId?: string;
  taskCode: string; // e.g. "TSK-001"
  title: string;
  description?: string;
  priority: TaskPriorityType;
  status: TaskStatusType;
  completionPercent: number; // 0 to 100
  isMilestone: boolean;
  milestoneTitle?: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  assignedEmployeeIds: string[];
  assignedContractorId?: string;
  siteId?: string;
  plannedManHours?: number;
  actualManHours?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type DependencyType = "FINISH_TO_START" | "START_TO_START" | "FINISH_TO_FINISH" | "START_TO_FINISH";

export interface DbTaskDependency {
  id: string;
  companyId: string;
  projectId: string;
  taskId: string; // Successor
  predecessorTaskId: string; // Predecessor
  dependencyType: DependencyType;
  lagDays: number;
  createdAt: Date;
}

export type MeasurementUnitType = "CUM" | "SQM" | "MT" | "RMT" | "NOS" | "LTR" | "BAGS";
export type ProgressActivityStatus = "PLANNED" | "IN_EXECUTION" | "COMPLETED";

export interface DbConstructionProgressActivity {
  id: string;
  companyId: string;
  projectId: string;
  taskId?: string;
  siteId: string;
  activityCode: string; // e.g. "ACT-CONC-01"
  activityName: string; // e.g. "M35 Grade Concrete Pouring - Podium"
  trade: string; // "CONCRETE", "STEEL", "MASONRY", etc.
  measurementUnit: MeasurementUnitType;
  plannedQuantity: number;
  actualQuantityExecuted: number;
  ratePerUnit: number;
  status: ProgressActivityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ProgressVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED" | "DISCREPANCY";

export interface DbProgressMeasurementLog {
  id: string;
  companyId: string;
  projectId: string;
  activityId: string;
  measurementDate: Date;
  quantityRecorded: number;
  locationDescription: string;
  recordedByUserId: string;
  verificationStatus: ProgressVerificationStatus;
  verifiedByUserId?: string;
  verifiedAt?: Date;
  verificationNotes?: string;
  sitePhotoUrls: string[];
  createdAt: Date;
}

export type DelayReasonCategory =
  | "WEATHER_MONSOON"
  | "MATERIAL_SHORTAGE"
  | "LABOUR_SHORTAGE"
  | "CLIENT_DRAWING_REVISION"
  | "PERMIT_DELAY"
  | "EQUIPMENT_BREAKDOWN"
  | "FINANCIAL"
  | "SITE_ACCIDENT";

export interface DbProjectDelayRecord {
  id: string;
  companyId: string;
  projectId: string;
  taskId?: string;
  siteId?: string;
  delayReasonCategory: DelayReasonCategory;
  delayDaysImpact: number;
  title: string;
  description: string;
  mitigationAction: string;
  isCriticalPathImpact: boolean;
  reportedByUserId: string;
  status: "OPEN" | "MITIGATING" | "RESOLVED";
  resolvedAt?: Date;
  createdAt: Date;
}

export type ProjectExpenseCategory = "LABOUR" | "MATERIAL" | "EQUIPMENT" | "CONTRACTOR" | "PERMITS_OVERHEAD";

export interface DbProjectExpense {
  id: string;
  companyId: string;
  projectId: string;
  costCategory: ProjectExpenseCategory;
  title: string;
  amount: number;
  date: Date;
  referenceType?: "CONTRACTOR_BILL" | "LABOUR_PAYROLL" | "MATERIAL_PO" | "EQUIPMENT_RENTAL" | "DIRECT_VOUCHER";
  referenceId?: string;
  vendorOrBeneficiary: string;
  notes?: string;
  createdAt: Date;
}

// ==============================================================================
// 12. INVENTORY & WAREHOUSE MANAGEMENT TYPES
// ==============================================================================

export type MaterialCategory =
  | "CEMENT"
  | "STEEL_REBAR"
  | "AGGREGATES_SAND"
  | "BRICKS_BLOCKS"
  | "ELECTRICAL"
  | "PLUMBING_PIPES"
  | "FINISHING_PAINT"
  | "TIMBER_FORMWORK"
  | "CHEMICALS_ADMIXTURES"
  | "SAFETY_PPE"
  | "OTHER";

export type InventoryUnit =
  | "BAGS"
  | "KG"
  | "MT"
  | "CUM"
  | "CFT"
  | "PCS"
  | "LTR"
  | "MTR"
  | "SQFT"
  | "SQM";

export type MaterialStatus = "ACTIVE" | "INACTIVE" | "DISCONTINUED";

export interface DbMaterial {
  id: string;
  companyId: string;
  materialCode: string; // e.g. "MAT-CEM-001"
  name: string; // e.g. "Portland Pozzolana Cement (PPC)"
  category: MaterialCategory;
  unitOfMeasurement: InventoryUnit;
  brand?: string; // "UltraTech", "Tata Tiscon"
  specification?: string; // "IS 1489 Part 1"
  standardRate: number; // Standard price in INR per unit
  preferredSupplier?: string;
  minimumStock: number; // Low-stock threshold
  maximumStock: number; // Warehouse capacity ceiling
  reorderLevel?: number; // Target replenishment trigger
  hsnCode?: string; // Harmonized System Nomenclature (e.g. "2523")
  gstPercent: number; // e.g. 18, 28
  barcode?: string;
  qrCode?: string;
  status: MaterialStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type WarehouseType = "CENTRAL" | "PROJECT" | "SITE_STORE";

export interface DbWarehouse {
  id: string;
  companyId: string;
  projectId?: string;
  siteId?: string;
  warehouseCode: string; // "WH-CEN-01", "WH-SKY-01"
  name: string; // "Peenya Central Logistics Hub", "Skyline Site Store"
  warehouseType: WarehouseType;
  address: string;
  managerUserId?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbStorageLocation {
  id: string;
  companyId: string;
  warehouseId: string;
  locationCode: string; // "BAY-A1", "YARD-STL-01", "RACK-E3"
  name: string;
  description?: string;
  zone?: "DRY_STORAGE" | "OPEN_YARD" | "HAZMAT" | "COVERED_SHED" | "ENCLOSED_RACK";
  isActive: boolean;
  createdAt: Date;
}

export interface DbWarehouseStock {
  id: string;
  companyId: string;
  warehouseId: string;
  storageLocationId?: string;
  materialId: string;
  quantity: number; // High-precision decimal
  allocatedQuantity: number; // Reserved for approved material requests
  availableQuantity: number; // quantity - allocatedQuantity
  averageUnitCost: number; // Weighted average unit valuation in INR
  lastMovementDate: Date;
  updatedAt: Date;
}

export type StockTransactionType =
  | "OPENING_STOCK"
  | "GOODS_RECEIPT_NOTE" // Inward receipt from vendor/supplier
  | "ISSUE_TO_SITE" // Outward issue for construction work / gang / contractor
  | "INTER_WAREHOUSE_TRANSFER_OUT" // Transfer departing
  | "INTER_WAREHOUSE_TRANSFER_IN" // Transfer arriving
  | "RETURN_FROM_SITE" // Excess or unconsumed material returned
  | "DAMAGED_WRITE_OFF" // Broken, spoiled or quarantined scrap
  | "WASTAGE_CONSUMPTION" // Scrap / cutting loss during execution
  | "STOCK_ADJUSTMENT" // Audit adjustment after physical count
  | "PHYSICAL_AUDIT_RECONCILIATION";

export type InventoryReferenceType =
  | "PURCHASE_ORDER"
  | "GOODS_RECEIPT_NOTE"
  | "MATERIAL_REQUEST"
  | "TRANSFER_CHALLAN"
  | "RETURN_VOUCHER"
  | "DAMAGE_REPORT"
  | "AUDIT_RECONCILIATION"
  | "DIRECT_MANUAL";

export interface DbStockLedgerEntry {
  id: string;
  companyId: string;
  projectId?: string;
  siteId?: string;
  transactionType: StockTransactionType;
  materialId: string;
  sourceWarehouseId?: string;
  sourceLocationId?: string;
  destinationWarehouseId?: string;
  destinationLocationId?: string;
  quantity: number; // Positive decimal
  unit: InventoryUnit;
  unitCost: number; // Cost in INR per unit
  totalValue: number; // quantity * unitCost
  referenceType: InventoryReferenceType;
  referenceNumber: string; // e.g. "GRN-2026-0042", "MR-2026-018"
  batchNumber?: string; // e.g. "BBS-HEAT-4482", "CEM-BATCH-26W04"
  performedByUserId: string;
  approvedByUserId?: string;
  timestamp: Date;
  remarks?: string;
}

export type MaterialRequestStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PM_APPROVED"
  | "STORE_CHECKED"
  | "ISSUED_PARTIAL"
  | "ISSUED_FULL"
  | "REJECTED"
  | "DELIVERED";

export type RequestPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface DbMaterialRequestItem {
  id: string;
  requestId: string;
  materialId: string;
  requestedQuantity: number;
  approvedQuantity?: number;
  issuedQuantity: number;
  unit: InventoryUnit;
  remarks?: string;
}

export interface DbMaterialRequest {
  id: string;
  companyId: string;
  projectId: string;
  siteId: string;
  requestCode: string; // e.g. "MR-APEX-0001"
  priority: RequestPriority;
  requestedByUserId: string; // Site Supervisor / Engineer
  approvedByUserId?: string; // Project Manager
  approvalNotes?: string;
  sourceWarehouseId?: string; // Selected warehouse for issuance
  targetSiteId: string;
  dateRequired: Date;
  status: MaterialRequestStatus;
  items: DbMaterialRequestItem[];
  createdAt: Date;
  updatedAt: Date;
}

export type StockTransferStatus = "DRAFT" | "DISPATCHED" | "IN_TRANSIT" | "RECEIVED" | "REJECTED";

export interface DbStockTransfer {
  id: string;
  companyId: string;
  transferCode: string; // "STC-2026-001"
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  materialId: string;
  quantity: number;
  unit: InventoryUnit;
  status: StockTransferStatus;
  initiatedByUserId: string;
  dispatchedAt?: Date;
  receivedByUserId?: string;
  receivedAt?: Date;
  vehicleNumber?: string;
  challanNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbSupplierPriceHistory {
  id: string;
  companyId: string;
  materialId: string;
  supplierName: string;
  unitRate: number;
  effectiveDate: Date;
  grnReferenceNumber?: string;
  notes?: string;
}

