// ==============================================================================
// CONSTRUCT360 ZOD DOMAIN VALIDATION SCHEMAS
// Strict Invariant Checks, PostGIS Spatial Boundaries & Financial Safeguards
// ==============================================================================

import { z } from "zod";

// ------------------------------------------------------------------------------
// COMMON VALUE OBJECTS & REUSABLE SCHEMAS
// ------------------------------------------------------------------------------

export const UuidSchema = z.string().uuid({ message: "Invalid UUID identifier" });

export const LatitudeSchema = z.coerce
  .number()
  .min(-90.0, { message: "Latitude must be >= -90.0" })
  .max(90.0, { message: "Latitude must be <= 90.0" });

export const LongitudeSchema = z.coerce
  .number()
  .min(-180.0, { message: "Longitude must be >= -180.0" })
  .max(180.0, { message: "Longitude must be <= 180.0" });

export const DecimalAmountSchema = z.coerce
  .number()
  .min(0, { message: "Monetary amount cannot be negative" })
  .refine((val) => Number(val.toFixed(2)) === val, {
    message: "Amount must not exceed 2 decimal places",
  });

export const PreciseRateSchema = z.coerce
  .number()
  .min(0, { message: "Unit rate cannot be negative" })
  .refine((val) => Number(val.toFixed(4)) === val, {
    message: "Rate must not exceed 4 decimal places",
  });

export const PositiveQuantitySchema = z.coerce
  .number()
  .positive({ message: "Quantity must be strictly greater than 0" });

// ------------------------------------------------------------------------------
// DOMAIN 1 & 2: TENANT & USER SCHEMAS
// ------------------------------------------------------------------------------

export const CompanyRegistrationSchema = z.object({
  code: z.string().min(2).max(50).regex(/^[A-Z0-9_-]+$/, "Code must be uppercase alphanumeric"),
  legalName: z.string().min(3).max(255),
  tradeName: z.string().max(255).optional(),
  taxId: z.string().max(50).optional(),
  registrationNumber: z.string().max(100).optional(),
  currency: z.string().length(3).default("INR"),
  email: z.string().email(),
  phone: z.string().min(10).max(30).optional(),
  website: z.string().url().optional(),
  timezone: z.string().default("Asia/Kolkata"),
});

export const BranchCreateSchema = z.object({
  companyId: UuidSchema,
  code: z.string().min(2).max(50),
  name: z.string().min(3).max(255),
  addressLine1: z.string().min(5),
  addressLine2: z.string().optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  country: z.string().default("India"),
  postalCode: z.string().min(4).max(20),
  isHeadquarters: z.boolean().default(false),
});

// ------------------------------------------------------------------------------
// DOMAIN 4, 5, 6: PERSONNEL & CONTRACTORS
// ------------------------------------------------------------------------------

export const LabourSkillLevelEnum = z.enum(["UNSKILLED", "SEMI_SKILLED", "SKILLED", "HIGHLY_SKILLED"]);
export const LabourTradeEnum = z.enum([
  "MASON", "CARPENTER", "BAR_BENDER", "ELECTRICIAN",
  "PLUMBER", "PAINTER", "WELDER", "SCAFFOLDER",
  "EQUIPMENT_OPERATOR", "SURVEY_HELPER", "GENERAL_HELPER", "OTHER",
]);

export const LabourerEnrollmentSchema = z.object({
  companyId: UuidSchema,
  contractorId: UuidSchema.optional(),
  labourerCode: z.string().min(2).max(50),
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(30).optional(),
  skillLevel: LabourSkillLevelEnum.default("UNSKILLED"),
  primaryTrade: LabourTradeEnum.default("GENERAL_HELPER"),
  dailyWageRate: DecimalAmountSchema.default(0.0),
  overtimeHourlyRate: DecimalAmountSchema.default(0.0),
  idProofType: z.string().max(50).optional(),
  idProofNumber: z.string().max(100).optional(),
  photoUrl: z.string().url().optional(),
  biometricEnrolled: z.boolean().default(false),
});

export const EmployeeCreateSchema = z.object({
  companyId: UuidSchema,
  branchId: UuidSchema.optional(),
  departmentId: UuidSchema.optional(),
  designationId: UuidSchema.optional(),
  reportingManagerId: UuidSchema.optional(),
  employeeCode: z.string().min(2).max(50),
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(30),
  joiningDate: z.coerce.date(),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z.string().max(30).optional(),
});

// ------------------------------------------------------------------------------
// DOMAIN 8 & 9: SITES & POSTGIS GEOFENCES
// ------------------------------------------------------------------------------

export const SiteCreateSchema = z.object({
  companyId: UuidSchema,
  projectId: UuidSchema,
  siteCode: z.string().min(2).max(50),
  name: z.string().min(3).max(255),
  siteEngineerId: UuidSchema.optional(),
  addressLine1: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  postalCode: z.string().min(4),
  latitude: LatitudeSchema,
  longitude: LongitudeSchema,
});

export const CircularGeofenceSchema = z.object({
  companyId: UuidSchema,
  siteId: UuidSchema,
  name: z.string().min(3).max(150),
  geofenceType: z.literal("CIRCULAR"),
  centerLatitude: LatitudeSchema,
  centerLongitude: LongitudeSchema,
  radiusMeters: z.coerce.number().positive().min(10).max(10000, "Geofence radius cannot exceed 10km"),
  isActive: z.boolean().default(true),
});

export const PolygonGeofenceSchema = z.object({
  companyId: UuidSchema,
  siteId: UuidSchema,
  name: z.string().min(3).max(150),
  geofenceType: z.literal("POLYGON"),
  // Must have at least 4 coordinates to form a closed linear ring (first == last)
  coordinates: z
    .array(
      z.object({
        latitude: LatitudeSchema,
        longitude: LongitudeSchema,
      })
    )
    .min(4, "Polygon must contain at least 4 vertices (closed loop)")
    .refine(
      (pts) =>
        pts[0].latitude === pts[pts.length - 1].latitude &&
        pts[0].longitude === pts[pts.length - 1].longitude,
      { message: "First and last coordinates of polygon must match to form a closed ring" }
    ),
  isActive: z.boolean().default(true),
});

export const GeofenceUpsertSchema = z.discriminatedUnion("geofenceType", [
  CircularGeofenceSchema,
  PolygonGeofenceSchema,
]);

// ------------------------------------------------------------------------------
// DOMAIN 11: ATTENDANCE & SPATIAL TELEMETRY
// ------------------------------------------------------------------------------

export const AttendanceEventTypeEnum = z.enum([
  "CLOCK_IN",
  "CLOCK_OUT",
  "BREAK_START",
  "BREAK_END",
  "SITE_TRANSFER",
]);

export const PunchSourceEnum = z.enum([
  "MOBILE_APP",
  "KIOSK_FACIAL",
  "BIOMETRIC_DEVICE",
  "SUPERVISOR_PORTAL",
  "AUTO_CHECKOUT",
]);

export const VerificationMethodEnum = z.enum([
  "GEOFENCE_ONLY",
  "FACE_RECOGNITION",
  "BIOMETRIC_FINGERPRINT",
  "QR_CODE_SCAN",
  "SUPERVISOR_OVERRIDE",
]);

export const AttendancePunchEventSchema = z.object({
  companyId: UuidSchema,
  sessionId: UuidSchema.optional(), // Computed or linked on server
  projectId: UuidSchema,
  siteId: UuidSchema,
  geofenceId: UuidSchema.optional(),
  workerType: z.enum(["EMPLOYEE", "LABOURER"]),
  workerId: UuidSchema, // Employee or Labourer ID
  eventType: AttendanceEventTypeEnum,
  eventTimestamp: z.coerce.date(),
  source: PunchSourceEnum.default("MOBILE_APP"),
  verificationMethod: VerificationMethodEnum.default("GEOFENCE_ONLY"),
  latitude: LatitudeSchema,
  longitude: LongitudeSchema,
  gpsAccuracyMeters: z.coerce.number().min(0).max(500, "GPS accuracy too degraded (>500m) for verification"),
  isMockLocation: z.boolean().default(false),
  photoUrl: z.string().url().optional(),
  deviceId: z.string().min(1).max(255).optional(),
  deviceModel: z.string().max(150).optional(),
  appVersion: z.string().max(50).optional(),
  osVersion: z.string().max(50).optional(),
  batteryLevelPct: z.number().int().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const AttendanceCorrectionRequestSchema = z.object({
  companyId: UuidSchema,
  sessionId: UuidSchema,
  correctionType: z.enum([
    "MISSING_CLOCK_IN",
    "MISSING_CLOCK_OUT",
    "WRONG_HOURS",
    "GEOFENCE_BYPASS_REQUEST",
    "DUTY_TRAVEL",
  ]),
  requestedClockIn: z.coerce.date(),
  requestedClockOut: z.coerce.date(),
  reason: z.string().min(10).max(1000),
  documentAttachmentUrl: z.string().url().optional(),
}).refine((data) => data.requestedClockOut > data.requestedClockIn, {
  message: "Clock out time must be strictly after clock in time",
  path: ["requestedClockOut"],
});

export const AttendanceApprovalSchema = z.object({
  companyId: UuidSchema,
  sessionId: UuidSchema.optional(),
  correctionId: UuidSchema.optional(),
  approvalTier: z.number().int().min(1).max(3),
  status: z.enum(["APPROVED", "REJECTED"]),
  comments: z.string().max(500).optional(),
  digitalSignatureHash: z.string().max(255).optional(),
});

// ------------------------------------------------------------------------------
// DOMAIN 17: STOCK TRANSACTIONS (Auditable Double-Entry Ledger)
// ------------------------------------------------------------------------------

export const StockTransactionTypeEnum = z.enum([
  "RECEIPT_PO",
  "ISSUE_PROJECT",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "RETURN_SUPPLIER",
  "RETURN_SITE",
  "WASTAGE_DAMAGE",
  "ADJUSTMENT_PHYSICAL",
]);

export const StockTransactionCreateSchema = z.object({
  companyId: UuidSchema,
  transactionType: StockTransactionTypeEnum,
  materialId: UuidSchema,
  sourceWarehouseId: UuidSchema.optional(),
  destinationWarehouseId: UuidSchema.optional(),
  projectId: UuidSchema.optional(),
  siteId: UuidSchema.optional(),
  quantity: PositiveQuantitySchema,
  unitRate: PreciseRateSchema.default(0.0),
  totalValue: DecimalAmountSchema.default(0.0),
  batchNumber: z.string().max(100).optional(),
  referenceType: z.enum(["GRN", "DISPATCH", "REQUISITION", "AUDIT", "RETURN"]),
  referenceId: UuidSchema.optional(),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => {
    switch (data.transactionType) {
      case "RECEIPT_PO":
      case "RETURN_SITE":
        return Boolean(data.destinationWarehouseId);
      case "ISSUE_PROJECT":
      case "RETURN_SUPPLIER":
      case "WASTAGE_DAMAGE":
        return Boolean(data.sourceWarehouseId);
      case "TRANSFER_OUT":
      case "TRANSFER_IN":
        return Boolean(data.sourceWarehouseId && data.destinationWarehouseId);
      case "ADJUSTMENT_PHYSICAL":
        return Boolean(data.sourceWarehouseId || data.destinationWarehouseId);
      default:
        return true;
    }
  },
  {
    message: "Invalid warehouse configuration for the specified stock transaction type",
    path: ["destinationWarehouseId"],
  }
);

// ------------------------------------------------------------------------------
// DOMAIN 19 & 20: PROCUREMENT & GRN
// ------------------------------------------------------------------------------

export const PurchaseOrderItemInputSchema = z.object({
  materialId: UuidSchema,
  orderedQuantity: PositiveQuantitySchema,
  unitPrice: PreciseRateSchema,
  taxPercent: z.coerce.number().min(0).max(100).default(0.0),
});

export const PurchaseOrderCreateSchema = z.object({
  companyId: UuidSchema,
  projectId: UuidSchema,
  supplierId: UuidSchema,
  orderDate: z.coerce.date(),
  expectedDeliveryDate: z.coerce.date().optional(),
  deliveryTerms: z.string().optional(),
  paymentTerms: z.string().optional(),
  shippingAddress: z.string().min(5),
  items: z.array(PurchaseOrderItemInputSchema).min(1, "At least one item is required in a purchase order"),
});

export const PurchaseReceiptItemInputSchema = z.object({
  poItemId: UuidSchema,
  materialId: UuidSchema,
  deliveredQuantity: PositiveQuantitySchema,
  acceptedQuantity: z.coerce.number().min(0),
  rejectedQuantity: z.coerce.number().min(0).default(0),
  rejectionReason: z.string().optional(),
  batchNumber: z.string().max(100).optional(),
}).refine(
  (item) => item.acceptedQuantity + item.rejectedQuantity <= item.deliveredQuantity,
  {
    message: "Sum of accepted and rejected quantities cannot exceed delivered quantity",
    path: ["acceptedQuantity"],
  }
);

export const PurchaseReceiptCreateSchema = z.object({
  companyId: UuidSchema,
  purchaseOrderId: UuidSchema,
  warehouseId: UuidSchema,
  challanNumber: z.string().max(100).optional(),
  challanDate: z.coerce.date().optional(),
  vehicleNumber: z.string().max(50).optional(),
  remarks: z.string().optional(),
  items: z.array(PurchaseReceiptItemInputSchema).min(1, "At least one item required in GRN"),
});

// ------------------------------------------------------------------------------
// DOMAIN 21 & 22: EXPENSES & PAYMENTS
// ------------------------------------------------------------------------------

export const ExpenseClaimSchema = z.object({
  companyId: UuidSchema,
  projectId: UuidSchema,
  siteId: UuidSchema.optional(),
  categoryId: UuidSchema,
  expenseDate: z.coerce.date(),
  amount: DecimalAmountSchema.refine((v) => v > 0, "Expense amount must be greater than zero"),
  currency: z.string().length(3).default("INR"),
  description: z.string().min(5).max(1000),
  receiptDocumentUrl: z.string().url().optional(),
});

export const PaymentRecordSchema = z.object({
  companyId: UuidSchema,
  projectId: UuidSchema,
  invoiceId: UuidSchema.optional(),
  direction: z.enum(["INCOMING", "OUTGOING"]),
  paymentMode: z.enum([
    "BANK_TRANSFER_NEFT",
    "RTGS",
    "IMPS",
    "CHEQUE",
    "UPI",
    "CASH",
    "CREDIT_CARD",
  ]),
  paymentDate: z.coerce.date(),
  amount: DecimalAmountSchema.refine((v) => v > 0, "Payment amount must be greater than zero"),
  currency: z.string().length(3).default("INR"),
  referenceNumber: z.string().max(100).optional(),
  bankName: z.string().max(150).optional(),
});

// ------------------------------------------------------------------------------
// DOMAIN 27: DAILY PROGRESS REPORT (DPR)
// ------------------------------------------------------------------------------

export const DprCreateSchema = z.object({
  companyId: UuidSchema,
  projectId: UuidSchema,
  siteId: UuidSchema,
  reportDate: z.coerce.date(),
  weatherSummary: z.string().max(100).optional(),
  temperatureCelsius: z.coerce.number().min(-30).max(65).optional(),
  generalSummary: z.string().min(10),
  obstaclesChallenges: z.string().optional(),
  safetyObservations: z.string().optional(),
  workItems: z.array(
    z.object({
      taskId: UuidSchema.optional(),
      activityDescription: z.string().min(3),
      locationDetails: z.string().max(255).optional(),
      uomId: UuidSchema.optional(),
      quantityExecuted: z.coerce.number().min(0),
      remarks: z.string().optional(),
    })
  ).default([]),
  manpowerCounts: z.array(
    z.object({
      contractorId: UuidSchema.optional(),
      trade: LabourTradeEnum,
      headcount: z.number().int().positive(),
      workingHours: z.coerce.number().positive().default(8.0),
    })
  ).default([]),
  equipmentUsages: z.array(
    z.object({
      equipmentId: UuidSchema,
      operatingHours: z.coerce.number().min(0),
      idleHours: z.coerce.number().min(0).default(0),
      breakdownHours: z.coerce.number().min(0).default(0),
      workDoneDescription: z.string().optional(),
    })
  ).default([]),
});

// ------------------------------------------------------------------------------
// DOMAIN 28: SAFETY INCIDENTS
// ------------------------------------------------------------------------------

export const SafetyIncidentReportSchema = z.object({
  companyId: UuidSchema,
  projectId: UuidSchema,
  siteId: UuidSchema,
  occurredAt: z.coerce.date(),
  incidentType: z.enum([
    "NEAR_MISS",
    "FIRST_AID",
    "MEDICAL_TREATMENT",
    "LOST_TIME_INJURY",
    "FATALITY",
    "PROPERTY_DAMAGE",
    "ENVIRONMENTAL",
  ]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  locationDetails: z.string().min(3).max(255),
  injuredPersonName: z.string().max(150).optional(),
  injuredPersonType: z.enum(["EMPLOYEE", "LABOURER", "CONTRACTOR"]).optional(),
  description: z.string().min(10),
  immediateActionsTaken: z.string().min(5),
  rootCauseAnalysis: z.string().optional(),
  correctiveActionsPlan: z.string().optional(),
});
