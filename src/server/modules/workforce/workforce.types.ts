// ==============================================================================
// WORKFORCE MODULE TYPES
// ==============================================================================

import type {
  ContractorTypeEnum,
  DbContractor,
  DbContractorBill,
  DbContractorPayment,
  DbDepartment,
  DbDesignation,
  DbEmployee,
  DbEmployeeDocument,
  DbEmployeeHistory,
  DbLabourTransfer,
  DbLabourWageAdvance,
  DbLabourer,
  DbLeaveBalance,
  DbLeaveRequest,
  DbLeaveType,
  DbSalaryStructure,
  EmploymentType,
  LabourTradeType,
} from "../../db/types";

export interface CreateEmployeeInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  departmentId?: string;
  designationId?: string;
  reportingManagerId?: string;
  assignedProjectId?: string;
  assignedSiteId?: string;
  employmentType: EmploymentType;
  joiningDate: string; // YYYY-MM-DD
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  bloodGroup?: string;
  nationality?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  photoUrl?: string;
  baseSalary?: number;
  hra?: number;
  conveyanceAllowance?: number;
  siteAllowance?: number;
}

export interface UpdateEmployeeInput extends Partial<CreateEmployeeInput> {
  status?: "ACTIVE" | "PROBATION" | "ON_NOTICE" | "TERMINATED" | "RESIGNED";
  exitDate?: string;
  reason?: string;
}

export interface QueryEmployeesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  employmentType?: string;
  departmentId?: string;
  designationId?: string;
  siteId?: string;
}

export interface CreateLabourerInput {
  firstName: string;
  lastName: string;
  phone?: string;
  contractorId?: string;
  skillLevel: "UNSKILLED" | "SEMI_SKILLED" | "SKILLED" | "HIGHLY_SKILLED";
  primaryTrade: LabourTradeType;
  dailyWageRate: number;
  hourlyWageRate?: number;
  pieceRateWage?: number;
  groupName?: string;
  currentProjectId?: string;
  currentSiteId?: string;
  emergencyPhone?: string;
  idProofType?: string;
  idProofNumber?: string;
  photoUrl?: string;
}

export interface UpdateLabourerInput extends Partial<CreateLabourerInput> {
  availabilityStatus?: "AVAILABLE" | "ON_SITE" | "ON_LEAVE" | "INACTIVE";
  isActive?: boolean;
}

export interface QueryLabourersParams {
  page?: number;
  limit?: number;
  search?: string;
  trade?: string;
  skillLevel?: string;
  contractorId?: string;
  siteId?: string;
  availabilityStatus?: string;
}

export interface CreateContractorInput {
  businessName: string;
  contractorType: ContractorTypeEnum;
  contactPerson: string;
  email?: string;
  phone: string;
  taxId?: string;
  panNumber?: string;
  address?: string;
  rating?: number;
  contractValidFrom: string; // YYYY-MM-DD
  contractValidTo: string;   // YYYY-MM-DD
  contractRates?: Record<string, number>;
  allocatedProjectIds?: string[];
  allocatedSiteIds?: string[];
}

export interface UpdateContractorInput extends Partial<CreateContractorInput> {
  isActive?: boolean;
}

export interface QueryContractorsParams {
  page?: number;
  limit?: number;
  search?: string;
  contractorType?: string;
  siteId?: string;
}

export interface LabourWageCalculationResult {
  labourerId: string;
  labourerName: string;
  labourerCode: string;
  trade: string;
  dailyWageRate: number;
  daysPresent: number;
  overtimeHours: number;
  overtimeRate: number;
  basicWages: number;
  overtimeWages: number;
  pieceRateWages: number;
  grossWages: number;
  advancesDeducted: number;
  netWagePayable: number;
}

export interface RequestAdvanceInput {
  labourerId: string;
  amount: number;
  reason: string;
}

export interface ReviewAdvanceInput {
  advanceId: string;
  decision: "APPROVED" | "REJECTED";
}

export interface TransferWorkerInput {
  labourerId: string;
  toSiteId: string;
  transferDate: string;
  reason: string;
}

export interface ReviewTransferInput {
  transferId: string;
  decision: "APPROVED" | "REJECTED";
}

export interface SubmitContractorBillInput {
  contractorId: string;
  billNumber: string;
  periodStartDate: string;
  periodEndDate: string;
  projectId?: string;
  siteId?: string;
  mandaysCount: number;
  grossAmount: number;
  deductionsAmount: number;
  notes?: string;
}

export interface ReviewContractorBillInput {
  billId: string;
  decision: "APPROVED" | "REJECTED";
  notes?: string;
}

export interface RecordContractorPaymentInput {
  billId: string;
  amount: number;
  paymentDate: string;
  paymentMode: "BANK_TRANSFER" | "CHEQUE" | "UPI" | "CASH";
  referenceNumber?: string;
  notes?: string;
}

export interface ApplyLeaveInput {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface ReviewLeaveInput {
  requestId: string;
  decision: "APPROVED" | "REJECTED";
}

export interface WorkforceDashboardSummary {
  totalEmployees: number;
  permanentEmployees: number;
  temporaryEmployees: number;
  totalLabourers: number;
  activeContractors: number;
  siteWiseWorkforce: {
    siteId: string;
    siteName: string;
    siteCode: string;
    employeesCount: number;
    labourersCount: number;
    totalWorkers: number;
  }[];
  tradeDistribution: { trade: string; count: number }[];
  skillDistribution: { skill: string; count: number }[];
  todayWorkersPresent: number;
  todayWorkersAbsent: number;
  availableWorkforce: number;
  pendingDocumentVerifications: number;
  pendingAdvanceRequests: number;
  pendingContractorBills: number;
}

export interface BulkImportWorkforceResult {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  errors: { row: number; identifier: string; reason: string }[];
}

export interface EmployeeProfileFull extends DbEmployee {
  departmentName?: string;
  designationTitle?: string;
  supervisorName?: string;
  projectName?: string;
  siteName?: string;
  salaryStructure?: DbSalaryStructure | null;
  documents: DbEmployeeDocument[];
  history: DbEmployeeHistory[];
}

export interface LabourerWithDetails extends DbLabourer {
  contractorName?: string;
  siteName?: string;
  projectName?: string;
  totalAdvancesAmount: number;
  pendingAdvancesCount: number;
}

export interface ContractorWithSummary extends DbContractor {
  assignedLabourersCount: number;
  totalBilledAmount: number;
  totalPaidAmount: number;
  outstandingAmount: number;
  bills: DbContractorBill[];
  payments: DbContractorPayment[];
}
