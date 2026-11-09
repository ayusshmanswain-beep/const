// ==============================================================================
// CONSTRUCT360 PROJECT MANAGEMENT SERVICE
// Business Logic, Multi-Tenant Isolation, Scoped RBAC, WBS, Gantt & Progress Verification
// ==============================================================================

import { randomUUID } from "node:crypto";
import type { SecurityContext } from "../../auth/context";
import {
  requireAuth,
  requirePermission,
  requireProjectAccess,
  requireTenant,
} from "../../auth/guards";
import { BadRequestError, NotFoundError } from "../../core/errors/app-error";
import { createPaginationMeta, type PaginationMeta } from "../../core/response/pagination";
import { db } from "../../db/client";
import type {
  DbConstructionProgressActivity,
  DbProgressMeasurementLog,
  DbProject,
  DbProjectDelayRecord,
  DbProjectDocument,
  DbProjectExpense,
  DbProjectTask,
  DbTaskDependency,
  DbWbsNode,
} from "../../db/types";
import { auditService } from "../audit/audit.service";
import { projectRepository, type ProjectRepository } from "./project.repository";
import type {
  AddTaskDependencyInput,
  AttachProjectDocumentInput,
  CreateProgressActivityInput,
  CreateProjectInput,
  CreateTaskInput,
  CreateWbsNodeInput,
  FinancialPerformance,
  LogProgressMeasurementInput,
  ProjectDashboardData,
  ProjectDetailFull,
  QueryProjectsParams,
  RecordProjectExpenseInput,
  ReportDelayInput,
  ResolveDelayInput,
  TaskWithDependencies,
  UpdateProjectInput,
  UpdateTaskInput,
  VerifyProgressMeasurementInput,
  WbsNodeTree,
} from "./project.types";

export class ProjectService {
  private readonly repo: ProjectRepository;

  constructor(repo: ProjectRepository = projectRepository) {
    this.repo = repo;
  }

  // ----------------------------------------------------------------------------
  // 1. PROJECT ENTITY MANAGEMENT
  // ----------------------------------------------------------------------------

  public async getProject(id: string, ctx: SecurityContext): Promise<ProjectDetailFull> {
    requireAuth(ctx);
    requireProjectAccess(ctx, id);
    requirePermission(ctx, "View", "projects", { projectId: id });

    const detail = await this.repo.getProjectDetailFull(id);
    if (!detail) throw new NotFoundError("Project", id);
    requireTenant(ctx, detail.project.companyId);

    return detail;
  }

  public async listProjects(
    ctx: SecurityContext,
    params: QueryProjectsParams = {}
  ): Promise<{ data: DbProject[]; meta: PaginationMeta }> {
    requireAuth(ctx);

    const { data, total } = await this.repo.findProjects(ctx.companyId, params);

    // If user has a project-scoped role, filter to permitted projects only
    const hasCompanyWideRole = ctx.isSuperAdmin || ctx.roles.some((r) => !r.projectId);
    let filteredData = data;
    if (!hasCompanyWideRole) {
      const allowedProjectIds = new Set(
        ctx.roles.map((r) => r.projectId).filter(Boolean) as string[]
      );
      filteredData = data.filter((p) => allowedProjectIds.has(p.id));
    }

    const meta = createPaginationMeta(
      params.page || 1,
      params.limit || 20,
      filteredData.length
    );

    return { data: filteredData, meta };
  }

  public async createProject(
    input: CreateProjectInput,
    ctx: SecurityContext
  ): Promise<DbProject> {
    requireAuth(ctx);
    requirePermission(ctx, "Create", "projects");

    const store = db.getStore();
    const branch = Array.from(store.branches.values()).find(
      (b) => b.companyId === ctx.companyId
    );

    const projectCode = await this.repo.generateNextProjectCode(ctx.companyId);

    const project: DbProject = {
      id: randomUUID(),
      companyId: ctx.companyId,
      branchId: branch?.id || randomUUID(),
      projectCode,
      name: input.name.trim(),
      description: input.description?.trim(),
      clientName: input.clientName.trim(),
      clientContactPerson: input.clientContactPerson?.trim(),
      clientEmail: input.clientEmail?.trim(),
      clientPhone: input.clientPhone?.trim(),
      projectManagerId: input.projectManagerId,
      contractValue: input.contractValue,
      budget: input.budget,
      status: "PLANNING",
      healthStatus: "ON_TRACK",
      startDate: new Date(input.startDate),
      plannedEndDate: new Date(input.plannedEndDate),
      assignedSiteIds: input.assignedSiteIds || [],
      assignedEmployeeIds: input.assignedEmployeeIds || [],
      assignedLabourerIds: input.assignedLabourerIds || [],
      overallProgressPercent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = await this.repo.createProject(project);

    await auditService.logEvent({
      companyId: ctx.companyId,
      actorUserId: ctx.user.id,
      action: "CREATE_PROJECT",
      tableName: "projects",
      recordId: created.id,
      newData: { projectCode: created.projectCode, name: created.name, budget: created.budget },
    });

    return created;
  }

  public async updateProject(
    id: string,
    input: UpdateProjectInput,
    ctx: SecurityContext
  ): Promise<DbProject> {
    requireAuth(ctx);
    requireProjectAccess(ctx, id);
    requirePermission(ctx, "Update", "projects", { projectId: id });

    const existing = await this.repo.findProjectById(id);
    if (!existing) throw new NotFoundError("Project", id);
    requireTenant(ctx, existing.companyId);

    const updates: Partial<DbProject> = {};
    if (input.name) updates.name = input.name.trim();
    if (input.description !== undefined) updates.description = input.description.trim();
    if (input.clientName) updates.clientName = input.clientName.trim();
    if (input.clientContactPerson !== undefined) updates.clientContactPerson = input.clientContactPerson.trim();
    if (input.clientEmail !== undefined) updates.clientEmail = input.clientEmail.trim();
    if (input.clientPhone !== undefined) updates.clientPhone = input.clientPhone.trim();
    if (input.projectManagerId !== undefined) updates.projectManagerId = input.projectManagerId;
    if (input.contractValue !== undefined) updates.contractValue = input.contractValue;
    if (input.budget !== undefined) updates.budget = input.budget;
    if (input.status) updates.status = input.status;
    if (input.healthStatus) updates.healthStatus = input.healthStatus;
    if (input.plannedEndDate) updates.plannedEndDate = new Date(input.plannedEndDate);
    if (input.actualStartDate) updates.actualStartDate = new Date(input.actualStartDate);
    if (input.actualEndDate) updates.actualEndDate = new Date(input.actualEndDate);
    if (input.assignedSiteIds) updates.assignedSiteIds = input.assignedSiteIds;
    if (input.assignedEmployeeIds) updates.assignedEmployeeIds = input.assignedEmployeeIds;
    if (input.assignedLabourerIds) updates.assignedLabourerIds = input.assignedLabourerIds;
    if (input.overallProgressPercent !== undefined) updates.overallProgressPercent = input.overallProgressPercent;

    const updated = await this.repo.updateProject(id, updates, ctx.user.id, input.reason);
    if (!updated) throw new NotFoundError("Project", id);

    await auditService.logEvent({
      companyId: existing.companyId,
      actorUserId: ctx.user.id,
      action: "UPDATE_PROJECT",
      tableName: "projects",
      recordId: id,
      newData: updates as unknown as Record<string, unknown>,
    });

    return updated;
  }

  // ----------------------------------------------------------------------------
  // 2. WORK BREAKDOWN STRUCTURE (WBS) & GANTT PLANNER
  // ----------------------------------------------------------------------------

  public async getWbsTree(projectId: string, ctx: SecurityContext): Promise<WbsNodeTree[]> {
    requireAuth(ctx);
    requireProjectAccess(ctx, projectId);
    requirePermission(ctx, "View", "projects", { projectId });

    const nodes = await this.repo.getWbsNodes(projectId);
    const tasks = await this.repo.getProjectTasks(projectId);
    const dependencies = await this.repo.getTaskDependencies(projectId);

    const store = db.getStore();

    // Enrich tasks with dependencies and assignee names
    const enrichedTasks: TaskWithDependencies[] = tasks.map((t) => {
      const preds = dependencies
        .filter((d) => d.taskId === t.id)
        .map((d) => {
          const predTask = tasks.find((pt) => pt.id === d.predecessorTaskId);
          return {
            dependencyId: d.id,
            predecessorTaskId: d.predecessorTaskId,
            predecessorCode: predTask?.taskCode || "UNKNOWN",
            predecessorTitle: predTask?.title || "Unknown Task",
            dependencyType: d.dependencyType,
            lagDays: d.lagDays,
          };
        });

      const succs = dependencies
        .filter((d) => d.predecessorTaskId === t.id)
        .map((d) => {
          const succTask = tasks.find((st) => st.id === d.taskId);
          return {
            dependencyId: d.id,
            successorTaskId: d.taskId,
            successorCode: succTask?.taskCode || "UNKNOWN",
            successorTitle: succTask?.title || "Unknown Task",
            dependencyType: d.dependencyType,
            lagDays: d.lagDays,
          };
        });

      const assignedEmployees = (t.assignedEmployeeIds || [])
        .map((id) => store.employees.get(id))
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
        .map((e) => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`,
          employeeCode: e.employeeCode,
          designation: e.designationId ? store.designations.get(e.designationId)?.title : undefined,
        }));

      const cont = t.assignedContractorId ? store.contractors.get(t.assignedContractorId) : undefined;
      const site = t.siteId ? store.sites.get(t.siteId) : undefined;

      return {
        ...t,
        predecessors: preds,
        successors: succs,
        assignedEmployees,
        contractor: cont ? { id: cont.id, businessName: cont.businessName, contractorCode: cont.contractorCode } : undefined,
        site: site ? { id: site.id, name: site.name, siteCode: site.siteCode } : undefined,
      };
    });

    // Build hierarchical tree
    const rootNodes = nodes.filter((n) => !n.parentWbsId);
    return rootNodes.map((root) => {
      const childNodes = nodes.filter((n) => n.parentWbsId === root.id);
      return {
        ...root,
        tasks: enrichedTasks.filter((t) => t.wbsNodeId === root.id),
        children: childNodes.map((child) => ({
          ...child,
          tasks: enrichedTasks.filter((t) => t.wbsNodeId === child.id),
        })),
      };
    });
  }

  public async createWbsNode(input: CreateWbsNodeInput, ctx: SecurityContext): Promise<DbWbsNode> {
    requireAuth(ctx);
    requireProjectAccess(ctx, input.projectId);
    requirePermission(ctx, "Update", "projects", { projectId: input.projectId });

    const node: DbWbsNode = {
      id: randomUUID(),
      companyId: ctx.companyId,
      projectId: input.projectId,
      wbsCode: input.wbsCode.trim(),
      name: input.name.trim(),
      description: input.description?.trim(),
      parentWbsId: input.parentWbsId,
      orderIndex: input.orderIndex || 1,
      createdAt: new Date(),
    };

    return this.repo.createWbsNode(node);
  }

  public async createTask(input: CreateTaskInput, ctx: SecurityContext): Promise<DbProjectTask> {
    requireAuth(ctx);
    requireProjectAccess(ctx, input.projectId);
    requirePermission(ctx, "Create", "tasks", { projectId: input.projectId });

    const taskCode = await this.repo.generateNextTaskCode(input.projectId);

    const task: DbProjectTask = {
      id: randomUUID(),
      companyId: ctx.companyId,
      projectId: input.projectId,
      wbsNodeId: input.wbsNodeId,
      parentTaskId: input.parentTaskId,
      taskCode,
      title: input.title.trim(),
      description: input.description?.trim(),
      priority: input.priority || "MEDIUM",
      status: "NOT_STARTED",
      completionPercent: 0,
      isMilestone: input.isMilestone || false,
      milestoneTitle: input.milestoneTitle?.trim(),
      plannedStartDate: new Date(input.plannedStartDate),
      plannedEndDate: new Date(input.plannedEndDate),
      assignedEmployeeIds: input.assignedEmployeeIds || [],
      assignedContractorId: input.assignedContractorId,
      siteId: input.siteId,
      plannedManHours: input.plannedManHours || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.repo.createTask(task);
  }

  public async updateTask(
    taskId: string,
    input: UpdateTaskInput,
    ctx: SecurityContext
  ): Promise<DbProjectTask> {
    requireAuth(ctx);
    const existing = await this.repo.findTaskById(taskId);
    if (!existing) throw new NotFoundError("Task", taskId);

    requireProjectAccess(ctx, existing.projectId);
    requirePermission(ctx, "Update", "tasks", { projectId: existing.projectId });

    const updates: Partial<DbProjectTask> = {};
    if (input.title) updates.title = input.title.trim();
    if (input.description !== undefined) updates.description = input.description.trim();
    if (input.priority) updates.priority = input.priority;
    if (input.status) updates.status = input.status;
    if (input.completionPercent !== undefined) {
      updates.completionPercent = Math.max(0, Math.min(100, input.completionPercent));
      if (updates.completionPercent === 100) {
        updates.status = "COMPLETED";
        if (!existing.actualEndDate) updates.actualEndDate = new Date();
      }
    }
    if (input.isMilestone !== undefined) updates.isMilestone = input.isMilestone;
    if (input.milestoneTitle !== undefined) updates.milestoneTitle = input.milestoneTitle.trim();
    if (input.plannedStartDate) updates.plannedStartDate = new Date(input.plannedStartDate);
    if (input.plannedEndDate) updates.plannedEndDate = new Date(input.plannedEndDate);
    if (input.actualStartDate) updates.actualStartDate = new Date(input.actualStartDate);
    if (input.actualEndDate) updates.actualEndDate = new Date(input.actualEndDate);
    if (input.assignedEmployeeIds) updates.assignedEmployeeIds = input.assignedEmployeeIds;
    if (input.assignedContractorId !== undefined) updates.assignedContractorId = input.assignedContractorId || undefined;
    if (input.siteId !== undefined) updates.siteId = input.siteId || undefined;
    if (input.actualManHours !== undefined) updates.actualManHours = input.actualManHours;

    const updated = await this.repo.updateTask(taskId, updates);
    if (!updated) throw new NotFoundError("Task", taskId);

    return updated;
  }

  // ----------------------------------------------------------------------------
  // 3. TASK DEPENDENCIES & CYCLE DETECTION
  // ----------------------------------------------------------------------------

  public async addTaskDependency(
    input: AddTaskDependencyInput,
    ctx: SecurityContext
  ): Promise<DbTaskDependency> {
    requireAuth(ctx);
    requireProjectAccess(ctx, input.projectId);
    requirePermission(ctx, "Update", "tasks", { projectId: input.projectId });

    if (input.taskId === input.predecessorTaskId) {
      throw new BadRequestError("A task cannot depend upon itself");
    }

    const task = await this.repo.findTaskById(input.taskId);
    if (!task || task.projectId !== input.projectId) {
      throw new NotFoundError("Task", input.taskId);
    }

    const predTask = await this.repo.findTaskById(input.predecessorTaskId);
    if (!predTask || predTask.projectId !== input.projectId) {
      throw new NotFoundError("Predecessor Task", input.predecessorTaskId);
    }

    // Check for circular dependency
    const allDeps = await this.repo.getTaskDependencies(input.projectId);

    // Build adjacency list for DFS cycle detection: successor -> predecessors
    const adj = new Map<string, string[]>();
    for (const d of allDeps) {
      if (!adj.has(d.taskId)) adj.set(d.taskId, []);
      adj.get(d.taskId)!.push(d.predecessorTaskId);
    }
    // Add proposed edge
    if (!adj.has(input.taskId)) adj.set(input.taskId, []);
    adj.get(input.taskId)!.push(input.predecessorTaskId);

    // DFS to check if input.taskId is reachable from input.predecessorTaskId
    const visited = new Set<string>();
    const stack = [input.predecessorTaskId];
    while (stack.length > 0) {
      const curr = stack.pop()!;
      if (curr === input.taskId) {
        throw new BadRequestError(
          `Circular dependency detected: Task '${task.taskCode}' cannot depend on '${predTask.taskCode}'`
        );
      }
      if (!visited.has(curr)) {
        visited.add(curr);
        const nextNodes = adj.get(curr) || [];
        for (const n of nextNodes) stack.push(n);
      }
    }

    const dep: DbTaskDependency = {
      id: randomUUID(),
      companyId: ctx.companyId,
      projectId: input.projectId,
      taskId: input.taskId,
      predecessorTaskId: input.predecessorTaskId,
      dependencyType: input.dependencyType || "FINISH_TO_START",
      lagDays: input.lagDays || 0,
      createdAt: new Date(),
    };

    return this.repo.addTaskDependency(dep);
  }

  // ----------------------------------------------------------------------------
  // 4. CONSTRUCTION PROGRESS ACTIVITIES & VERIFICATION
  // ----------------------------------------------------------------------------

  public async getProgressActivities(
    projectId: string,
    ctx: SecurityContext
  ): Promise<DbConstructionProgressActivity[]> {
    requireAuth(ctx);
    requireProjectAccess(ctx, projectId);
    requirePermission(ctx, "View", "progress", { projectId });

    return this.repo.getProgressActivities(projectId);
  }

  public async createProgressActivity(
    input: CreateProgressActivityInput,
    ctx: SecurityContext
  ): Promise<DbConstructionProgressActivity> {
    requireAuth(ctx);
    requireProjectAccess(ctx, input.projectId);
    requirePermission(ctx, "Create", "progress", { projectId: input.projectId });

    let siteId = input.siteId;
    if (!siteId) {
      const proj = await this.repo.findProjectById(input.projectId);
      siteId = proj?.assignedSiteIds?.[0] || "";
    }

    const act: DbConstructionProgressActivity = {
      id: randomUUID(),
      companyId: ctx.companyId,
      projectId: input.projectId,
      taskId: input.taskId,
      siteId,
      activityCode: input.activityCode.trim(),
      activityName: input.activityName.trim(),
      trade: input.trade.trim(),
      measurementUnit: input.measurementUnit,
      plannedQuantity: input.plannedQuantity,
      actualQuantityExecuted: 0,
      ratePerUnit: input.ratePerUnit || 0,
      status: "PLANNED",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.repo.createProgressActivity(act);
  }

  public async logProgressMeasurement(
    input: LogProgressMeasurementInput,
    ctx: SecurityContext
  ): Promise<DbProgressMeasurementLog> {
    requireAuth(ctx);
    requireProjectAccess(ctx, input.projectId);
    requirePermission(ctx, "Create", "progress", { projectId: input.projectId });

    const activity = await this.repo.findProgressActivityById(input.activityId);
    if (!activity || activity.projectId !== input.projectId) {
      throw new NotFoundError("ProgressActivity", input.activityId);
    }

    const log: DbProgressMeasurementLog = {
      id: randomUUID(),
      companyId: ctx.companyId,
      projectId: input.projectId,
      activityId: input.activityId,
      measurementDate: input.measurementDate ? new Date(input.measurementDate) : new Date(),
      quantityRecorded: input.quantityRecorded,
      locationDescription: input.locationDescription.trim(),
      recordedByUserId: ctx.user.id,
      verificationStatus: "PENDING",
      sitePhotoUrls: input.sitePhotoUrls || [],
      createdAt: new Date(),
    };

    return this.repo.logProgressMeasurement(log);
  }

  public async verifyProgressMeasurement(
    input: VerifyProgressMeasurementInput,
    ctx: SecurityContext
  ): Promise<DbProgressMeasurementLog> {
    requireAuth(ctx);
    requirePermission(ctx, "Approve", "progress");

    const verified = await this.repo.verifyMeasurementLog(
      input.logId,
      input.status,
      ctx.user.id,
      input.notes
    );
    if (!verified) throw new NotFoundError("ProgressMeasurementLog", input.logId);

    await auditService.logEvent({
      companyId: verified.companyId,
      actorUserId: ctx.user.id,
      action: "VERIFY_CONSTRUCTION_PROGRESS",
      tableName: "progress_measurement_logs",
      recordId: verified.id,
      newData: { status: input.status, notes: input.notes },
    });

    return verified;
  }

  // ----------------------------------------------------------------------------
  // 5. DELAYS & FINANCIAL EXPENSES
  // ----------------------------------------------------------------------------

  public async reportDelay(
    input: ReportDelayInput,
    ctx: SecurityContext
  ): Promise<DbProjectDelayRecord> {
    requireAuth(ctx);
    requireProjectAccess(ctx, input.projectId);
    requirePermission(ctx, "Create", "projects", { projectId: input.projectId });

    const delay: DbProjectDelayRecord = {
      id: randomUUID(),
      companyId: ctx.companyId,
      projectId: input.projectId,
      taskId: input.taskId,
      siteId: input.siteId,
      delayReasonCategory: input.delayReasonCategory,
      delayDaysImpact: input.delayDaysImpact,
      title: input.title.trim(),
      description: input.description.trim(),
      mitigationAction: input.mitigationAction.trim(),
      isCriticalPathImpact: input.isCriticalPathImpact || false,
      reportedByUserId: ctx.user.id,
      status: "OPEN",
      createdAt: new Date(),
    };

    return this.repo.reportDelay(delay);
  }

  public async resolveDelay(
    input: ResolveDelayInput,
    ctx: SecurityContext
  ): Promise<DbProjectDelayRecord> {
    requireAuth(ctx);
    requirePermission(ctx, "Update", "projects");

    const resolved = await this.repo.resolveDelay(input.delayId, input.mitigationNotes);
    if (!resolved) throw new NotFoundError("ProjectDelayRecord", input.delayId);

    return resolved;
  }

  public async recordProjectExpense(
    input: RecordProjectExpenseInput,
    ctx: SecurityContext
  ): Promise<DbProjectExpense> {
    requireAuth(ctx);
    requireProjectAccess(ctx, input.projectId);
    requirePermission(ctx, "Create", "finance");

    const expense: DbProjectExpense = {
      id: randomUUID(),
      companyId: ctx.companyId,
      projectId: input.projectId,
      costCategory: input.costCategory,
      title: input.title.trim(),
      amount: input.amount,
      date: input.date ? new Date(input.date) : new Date(),
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      vendorOrBeneficiary: input.vendorOrBeneficiary.trim(),
      notes: input.notes?.trim(),
      createdAt: new Date(),
    };

    const recorded = await this.repo.recordExpense(expense);

    await auditService.logEvent({
      companyId: ctx.companyId,
      actorUserId: ctx.user.id,
      action: "RECORD_PROJECT_EXPENSE",
      tableName: "project_expenses",
      recordId: recorded.id,
      newData: { costCategory: recorded.costCategory, amount: recorded.amount },
    });

    return recorded;
  }

  public async attachProjectDocument(
    input: AttachProjectDocumentInput,
    ctx: SecurityContext
  ): Promise<DbProjectDocument> {
    requireAuth(ctx);
    requireProjectAccess(ctx, input.projectId);
    requirePermission(ctx, "Create", "documents", { projectId: input.projectId });

    const doc: DbProjectDocument = {
      id: randomUUID(),
      companyId: ctx.companyId,
      projectId: input.projectId,
      documentType: input.documentType,
      title: input.title.trim(),
      fileName: input.fileName.trim(),
      fileUrl: input.fileUrl.trim(),
      fileSizeBytes: input.fileSizeBytes,
      version: input.version || "v1.0",
      uploadedByUserId: ctx.user.id,
      createdAt: new Date(),
    };

    return this.repo.addProjectDocument(doc);
  }

  public async getMeasurementLogs(
    projectId: string,
    ctx: SecurityContext,
    activityId?: string
  ): Promise<DbProgressMeasurementLog[]> {
    requireAuth(ctx);
    requireProjectAccess(ctx, projectId);
    requirePermission(ctx, "View", "progress", { projectId });

    return this.repo.getMeasurementLogs(projectId, activityId);
  }

  public async getDelayRecords(
    projectId: string,
    ctx: SecurityContext
  ): Promise<DbProjectDelayRecord[]> {
    requireAuth(ctx);
    requireProjectAccess(ctx, projectId);
    requirePermission(ctx, "View", "projects", { projectId });

    return this.repo.getDelayRecords(projectId);
  }

  public async getProjectDocuments(
    projectId: string,
    ctx: SecurityContext
  ): Promise<DbProjectDocument[]> {
    requireAuth(ctx);
    requireProjectAccess(ctx, projectId);
    requirePermission(ctx, "View", "documents", { projectId });

    return this.repo.getProjectDocuments(projectId);
  }

  // ----------------------------------------------------------------------------
  // 6. DASHBOARD & FINANCIALS ROLLUP
  // ----------------------------------------------------------------------------

  public async getProjectDashboard(
    projectId: string,
    ctx: SecurityContext
  ): Promise<ProjectDashboardData> {
    requireAuth(ctx);
    requireProjectAccess(ctx, projectId);
    requirePermission(ctx, "View", "projects", { projectId });

    const data = await this.repo.getProjectDashboard(projectId);
    if (!data) throw new NotFoundError("Project", projectId);
    requireTenant(ctx, data.project.companyId);

    return data;
  }

  public async getProjectFinancials(
    projectId: string,
    ctx: SecurityContext
  ): Promise<FinancialPerformance & { expenses: DbProjectExpense[] }> {
    requireAuth(ctx);
    requireProjectAccess(ctx, projectId);
    requirePermission(ctx, "View", "finance", { projectId });

    const project = await this.repo.findProjectById(projectId);
    if (!project) throw new NotFoundError("Project", projectId);
    requireTenant(ctx, project.companyId);

    const financials = await this.repo.calculateProjectFinancials(project);
    const expenses = await this.repo.getProjectExpenses(projectId);

    return {
      ...financials,
      expenses,
    };
  }
}

export const projectService = new ProjectService();
