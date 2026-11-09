// ==============================================================================
// CONSTRUCT360 PROJECT MANAGEMENT DTOs & DOMAIN TYPES
// ==============================================================================

import type {
  DbConstructionProgressActivity,
  DbProgressMeasurementLog,
  DbProject,
  DbProjectDelayRecord,
  DbProjectDocument,
  DbProjectExpense,
  DbProjectHistory,
  DbProjectTask,
  DbSite,
  DbTaskDependency,
  DbWbsNode,
  DelayReasonCategory,
  DependencyType,
  MeasurementUnitType,
  ProgressVerificationStatus,
  ProjectDocumentType,
  ProjectExpenseCategory,
  TaskPriorityType,
  TaskStatusType,
} from "../../db/types";

// ----------------------------------------------------------------------------
// PROJECT LIFECYCLE DTOs
// ----------------------------------------------------------------------------

export interface CreateProjectInput {
  name: string;
  description?: string;
  clientName: string;
  clientContactPerson?: string;
  clientEmail?: string;
  clientPhone?: string;
  projectManagerId?: string;
  contractValue: number;
  budget: number;
  startDate: string; // YYYY-MM-DD
  plannedEndDate: string; // YYYY-MM-DD
  assignedSiteIds?: string[];
  assignedEmployeeIds?: string[];
  assignedLabourerIds?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  clientName?: string;
  clientContactPerson?: string;
  clientEmail?: string;
  clientPhone?: string;
  projectManagerId?: string;
  contractValue?: number;
  budget?: number;
  status?: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
  healthStatus?: "ON_TRACK" | "AT_RISK" | "DELAYED";
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  assignedSiteIds?: string[];
  assignedEmployeeIds?: string[];
  assignedLabourerIds?: string[];
  overallProgressPercent?: number;
  reason?: string; // Audit reason
}

export interface QueryProjectsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  healthStatus?: string;
  projectManagerId?: string;
  sortBy?: "name" | "projectCode" | "startDate" | "budget" | "overallProgressPercent";
  sortOrder?: "asc" | "desc";
}

// ----------------------------------------------------------------------------
// WBS & GANTT TASK DTOs
// ----------------------------------------------------------------------------

export interface CreateWbsNodeInput {
  projectId: string;
  wbsCode: string;
  name: string;
  description?: string;
  parentWbsId?: string;
  orderIndex?: number;
}

export interface CreateTaskInput {
  projectId: string;
  wbsNodeId?: string;
  parentTaskId?: string;
  title: string;
  description?: string;
  priority?: TaskPriorityType;
  isMilestone?: boolean;
  milestoneTitle?: string;
  plannedStartDate: string; // YYYY-MM-DD
  plannedEndDate: string; // YYYY-MM-DD
  assignedEmployeeIds?: string[];
  assignedContractorId?: string;
  siteId?: string;
  plannedManHours?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriorityType;
  status?: TaskStatusType;
  completionPercent?: number;
  isMilestone?: boolean;
  milestoneTitle?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  assignedEmployeeIds?: string[];
  assignedContractorId?: string | null;
  siteId?: string | null;
  actualManHours?: number;
}

export interface AddTaskDependencyInput {
  projectId: string;
  taskId: string; // Successor
  predecessorTaskId: string; // Predecessor
  dependencyType?: DependencyType;
  lagDays?: number;
}

// ----------------------------------------------------------------------------
// CONSTRUCTION PROGRESS & VERIFICATION DTOs
// ----------------------------------------------------------------------------

export interface CreateProgressActivityInput {
  projectId: string;
  taskId?: string;
  siteId?: string;
  activityCode: string;
  activityName: string;
  trade: string;
  measurementUnit: MeasurementUnitType;
  plannedQuantity: number;
  ratePerUnit?: number;
}

export interface LogProgressMeasurementInput {
  projectId: string;
  activityId: string;
  measurementDate?: string; // YYYY-MM-DD
  quantityRecorded: number;
  locationDescription: string;
  sitePhotoUrls?: string[];
  notes?: string;
}

export interface VerifyProgressMeasurementInput {
  logId: string;
  status: ProgressVerificationStatus;
  notes?: string;
}

// ----------------------------------------------------------------------------
// DELAYS & FINANCIALS DTOs
// ----------------------------------------------------------------------------

export interface ReportDelayInput {
  projectId: string;
  taskId?: string;
  siteId?: string;
  delayReasonCategory: DelayReasonCategory;
  delayDaysImpact: number;
  title: string;
  description: string;
  mitigationAction: string;
  isCriticalPathImpact?: boolean;
}

export interface ResolveDelayInput {
  delayId: string;
  mitigationNotes?: string;
}

export interface RecordProjectExpenseInput {
  projectId: string;
  costCategory: ProjectExpenseCategory;
  title: string;
  amount: number;
  date?: string; // YYYY-MM-DD
  referenceType?: "CONTRACTOR_BILL" | "LABOUR_PAYROLL" | "MATERIAL_PO" | "EQUIPMENT_RENTAL" | "DIRECT_VOUCHER";
  referenceId?: string;
  vendorOrBeneficiary: string;
  notes?: string;
}

export interface AttachProjectDocumentInput {
  projectId: string;
  documentType: ProjectDocumentType;
  title: string;
  fileName: string;
  fileUrl: string;
  fileSizeBytes?: number;
  version?: string;
}

// ----------------------------------------------------------------------------
// DASHBOARD & FINANCIAL ANALYTICS MODELS
// ----------------------------------------------------------------------------

export interface FinancialPerformance {
  approvedBudget: number;
  contractValue: number;
  totalActualExpenses: number;
  labourCost: number;
  materialCost: number;
  equipmentCost: number;
  contractorCost: number;
  overheadCost: number;
  remainingBudget: number;
  budgetVarianceAmount: number; // positive = under budget, negative = overrun
  budgetVariancePercent: number;
  costOverrunRisk: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
}

export interface TaskWithDependencies extends DbProjectTask {
  predecessors: Array<{
    dependencyId: string;
    predecessorTaskId: string;
    predecessorCode: string;
    predecessorTitle: string;
    dependencyType: DependencyType;
    lagDays: number;
  }>;
  successors: Array<{
    dependencyId: string;
    successorTaskId: string;
    successorCode: string;
    successorTitle: string;
    dependencyType: DependencyType;
    lagDays: number;
  }>;
  assignedEmployees: Array<{
    id: string;
    name: string;
    employeeCode: string;
    designation?: string;
  }>;
  contractor?: {
    id: string;
    businessName: string;
    contractorCode: string;
  };
  site?: {
    id: string;
    name: string;
    siteCode: string;
  };
}

export interface WbsNodeTree extends DbWbsNode {
  children?: WbsNodeTree[];
  tasks: TaskWithDependencies[];
}

export interface ProjectDashboardData {
  project: DbProject;
  projectManager?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  overallProgressPercent: number;
  healthStatus: "ON_TRACK" | "AT_RISK" | "DELAYED";
  schedule: {
    startDate: string;
    plannedEndDate: string;
    totalDays: number;
    daysElapsed: number;
    daysRemaining: number;
    timelinePercent: number;
    milestonesTotal: number;
    milestonesAchieved: number;
    delayedTasksCount: number;
  };
  financials: FinancialPerformance;
  workforce: {
    assignedSitesCount: number;
    assignedEngineersCount: number;
    assignedLabourersCount: number;
    activeContractorsCount: number;
    totalMusterDeployed: number;
  };
  progressActivitiesSummary: {
    totalActivities: number;
    inExecutionCount: number;
    completedCount: number;
    averageExecutionPercent: number;
  };
  pendingApprovalsCount: {
    measurementLogs: number;
    openDelays: number;
    total: number;
  };
  recentActivities: DbConstructionProgressActivity[];
  recentMeasurements: DbProgressMeasurementLog[];
  recentDelays: DbProjectDelayRecord[];
}

export interface ProjectDetailFull {
  project: DbProject;
  projectManager?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  sites: DbSite[];
  assignedEmployees: Array<{
    id: string;
    name: string;
    code: string;
    designation?: string;
  }>;
  assignedLabourers: Array<{
    id: string;
    name: string;
    code: string;
    trade: string;
    skillLevel: string;
  }>;
  documents: DbProjectDocument[];
  history: DbProjectHistory[];
}
