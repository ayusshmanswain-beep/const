// ==============================================================================
// CONSTRUCT360 PROJECT MANAGEMENT REPOSITORY
// High-Fidelity Data Access for Projects, WBS, Gantt Tasks, BOQ Progress & Costs
// ==============================================================================

import { randomUUID } from "node:crypto";
import { db } from "../../db/client";
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
  ProgressVerificationStatus,
} from "../../db/types";
import type {
  FinancialPerformance,
  ProjectDashboardData,
  ProjectDetailFull,
  QueryProjectsParams,
  TaskWithDependencies,
  WbsNodeTree,
} from "./project.types";

export class ProjectRepository {
  // ----------------------------------------------------------------------------
  // 1. PROJECT ENTITY MANAGEMENT
  // ----------------------------------------------------------------------------

  public async findProjectById(id: string): Promise<DbProject | null> {
    const store = db.getStore();
    return store.projects.get(id) || null;
  }

  public async findProjects(
    companyId: string,
    params: QueryProjectsParams = {}
  ): Promise<{ data: DbProject[]; total: number }> {
    const store = db.getStore();
    let projects = Array.from(store.projects.values()).filter(
      (p) => p.companyId === companyId
    );

    // Filters
    if (params.search) {
      const q = params.search.toLowerCase();
      projects = projects.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.projectCode.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q)
      );
    }

    if (params.status) {
      projects = projects.filter((p) => p.status === params.status);
    }

    if (params.healthStatus) {
      projects = projects.filter((p) => p.healthStatus === params.healthStatus);
    }

    if (params.projectManagerId) {
      projects = projects.filter((p) => p.projectManagerId === params.projectManagerId);
    }

    // Sorting
    const sortBy = params.sortBy || "startDate";
    const sortOrder = params.sortOrder || "desc";

    projects.sort((a, b) => {
      let valA: any = (a as any)[sortBy];
      let valB: any = (b as any)[sortBy];

      if (valA instanceof Date) valA = valA.getTime();
      if (valB instanceof Date) valB = valB.getTime();

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    const total = projects.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    return {
      data: projects.slice(offset, offset + limit),
      total,
    };
  }

  public async generateNextProjectCode(companyId: string): Promise<string> {
    const store = db.getStore();
    const existing = Array.from(store.projects.values()).filter(
      (p) => p.companyId === companyId
    );

    let maxSeq = 0;
    for (const p of existing) {
      const match = p.projectCode.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSeq) maxSeq = num;
      }
    }

    const nextSeq = maxSeq + 1;
    return `PRJ-APEX-${String(nextSeq).padStart(3, "0")}`;
  }

  public async createProject(project: DbProject): Promise<DbProject> {
    return db.transaction(async (store) => {
      store.projects.set(project.id, project);

      store.projectHistories.push({
        id: randomUUID(),
        companyId: project.companyId,
        projectId: project.id,
        eventType: "PROJECT_CREATED",
        description: `Project '${project.name}' initialized with budget of ₹${project.budget.toLocaleString("en-IN")}`,
        changedByUserId: project.projectManagerId || "SYSTEM",
        newValue: project.status,
        effectiveDate: new Date(),
        createdAt: new Date(),
      });

      return project;
    });
  }

  public async updateProject(
    id: string,
    updates: Partial<DbProject>,
    userId: string,
    reason?: string
  ): Promise<DbProject | null> {
    return db.transaction(async (store) => {
      const project = store.projects.get(id);
      if (!project) return null;

      const now = new Date();

      if (updates.status && updates.status !== project.status) {
        store.projectHistories.push({
          id: randomUUID(),
          companyId: project.companyId,
          projectId: project.id,
          eventType: "STATUS_CHANGE",
          description: reason || `Project status changed from ${project.status} to ${updates.status}`,
          changedByUserId: userId,
          oldValue: project.status,
          newValue: updates.status,
          effectiveDate: now,
          createdAt: now,
        });
      }

      if (updates.budget !== undefined && updates.budget !== project.budget) {
        store.projectHistories.push({
          id: randomUUID(),
          companyId: project.companyId,
          projectId: project.id,
          eventType: "BUDGET_REVISED",
          description: reason || `Budget revised from ₹${project.budget.toLocaleString("en-IN")} to ₹${updates.budget.toLocaleString("en-IN")}`,
          changedByUserId: userId,
          oldValue: String(project.budget),
          newValue: String(updates.budget),
          effectiveDate: now,
          createdAt: now,
        });
      }

      if (updates.projectManagerId && updates.projectManagerId !== project.projectManagerId) {
        store.projectHistories.push({
          id: randomUUID(),
          companyId: project.companyId,
          projectId: project.id,
          eventType: "MANAGER_ASSIGNED",
          description: `Project manager reassigned`,
          changedByUserId: userId,
          oldValue: project.projectManagerId || "None",
          newValue: updates.projectManagerId,
          effectiveDate: now,
          createdAt: now,
        });
      }

      const updated: DbProject = {
        ...project,
        ...updates,
        updatedAt: now,
      };

      store.projects.set(id, updated);
      return updated;
    });
  }

  // ----------------------------------------------------------------------------
  // 2. PROJECT HISTORY & DOCUMENTS
  // ----------------------------------------------------------------------------

  public async addProjectHistory(history: DbProjectHistory): Promise<DbProjectHistory> {
    const store = db.getStore();
    store.projectHistories.push(history);
    return history;
  }

  public async getProjectHistory(projectId: string): Promise<DbProjectHistory[]> {
    const store = db.getStore();
    return store.projectHistories
      .filter((h) => h.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async addProjectDocument(doc: DbProjectDocument): Promise<DbProjectDocument> {
    const store = db.getStore();
    store.projectDocuments.set(doc.id, doc);
    return doc;
  }

  public async getProjectDocuments(projectId: string): Promise<DbProjectDocument[]> {
    const store = db.getStore();
    return Array.from(store.projectDocuments.values())
      .filter((d) => d.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ----------------------------------------------------------------------------
  // 3. WORK BREAKDOWN STRUCTURE (WBS) & GANTT TASKS
  // ----------------------------------------------------------------------------

  public async createWbsNode(node: DbWbsNode): Promise<DbWbsNode> {
    const store = db.getStore();
    store.wbsNodes.set(node.id, node);
    return node;
  }

  public async getWbsNodes(projectId: string): Promise<DbWbsNode[]> {
    const store = db.getStore();
    return Array.from(store.wbsNodes.values())
      .filter((w) => w.projectId === projectId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public async generateNextTaskCode(projectId: string): Promise<string> {
    const store = db.getStore();
    const existing = Array.from(store.projectTasks.values()).filter(
      (t) => t.projectId === projectId
    );

    let maxSeq = 0;
    for (const t of existing) {
      const match = t.taskCode.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSeq) maxSeq = num;
      }
    }

    const nextSeq = maxSeq + 1;
    return `TSK-${String(nextSeq).padStart(3, "0")}`;
  }

  public async createTask(task: DbProjectTask): Promise<DbProjectTask> {
    const store = db.getStore();
    store.projectTasks.set(task.id, task);
    return task;
  }

  public async findTaskById(taskId: string): Promise<DbProjectTask | null> {
    const store = db.getStore();
    return store.projectTasks.get(taskId) || null;
  }

  public async updateTask(
    taskId: string,
    updates: Partial<DbProjectTask>
  ): Promise<DbProjectTask | null> {
    return db.transaction(async (store) => {
      const task = store.projectTasks.get(taskId);
      if (!task) return null;

      const updated: DbProjectTask = {
        ...task,
        ...updates,
        updatedAt: new Date(),
      };

      store.projectTasks.set(taskId, updated);
      return updated;
    });
  }

  public async getProjectTasks(projectId: string): Promise<DbProjectTask[]> {
    const store = db.getStore();
    return Array.from(store.projectTasks.values())
      .filter((t) => t.projectId === projectId)
      .sort((a, b) => a.plannedStartDate.getTime() - b.plannedStartDate.getTime());
  }

  public async addTaskDependency(dep: DbTaskDependency): Promise<DbTaskDependency> {
    const store = db.getStore();
    store.taskDependencies.set(dep.id, dep);
    return dep;
  }

  public async getTaskDependencies(projectId: string): Promise<DbTaskDependency[]> {
    const store = db.getStore();
    return Array.from(store.taskDependencies.values()).filter(
      (d) => d.projectId === projectId
    );
  }

  // ----------------------------------------------------------------------------
  // 4. CONSTRUCTION PROGRESS & MEASUREMENT VERIFICATION
  // ----------------------------------------------------------------------------

  public async createProgressActivity(
    act: DbConstructionProgressActivity
  ): Promise<DbConstructionProgressActivity> {
    const store = db.getStore();
    store.progressActivities.set(act.id, act);
    return act;
  }

  public async getProgressActivities(
    projectId: string
  ): Promise<DbConstructionProgressActivity[]> {
    const store = db.getStore();
    return Array.from(store.progressActivities.values())
      .filter((a) => a.projectId === projectId)
      .sort((a, b) => a.activityCode.localeCompare(b.activityCode));
  }

  public async findProgressActivityById(
    activityId: string
  ): Promise<DbConstructionProgressActivity | null> {
    const store = db.getStore();
    return store.progressActivities.get(activityId) || null;
  }

  public async logProgressMeasurement(
    log: DbProgressMeasurementLog
  ): Promise<DbProgressMeasurementLog> {
    const store = db.getStore();
    store.measurementLogs.set(log.id, log);
    return log;
  }

  public async getMeasurementLogs(
    projectId: string,
    activityId?: string
  ): Promise<DbProgressMeasurementLog[]> {
    const store = db.getStore();
    let logs = Array.from(store.measurementLogs.values()).filter(
      (l) => l.projectId === projectId
    );

    if (activityId) {
      logs = logs.filter((l) => l.activityId === activityId);
    }

    return logs.sort((a, b) => b.measurementDate.getTime() - a.measurementDate.getTime());
  }

  public async verifyMeasurementLog(
    logId: string,
    status: ProgressVerificationStatus,
    userId: string,
    notes?: string
  ): Promise<DbProgressMeasurementLog | null> {
    return db.transaction(async (store) => {
      const log = store.measurementLogs.get(logId);
      if (!log) return null;

      log.verificationStatus = status;
      log.verifiedByUserId = userId;
      log.verifiedAt = new Date();
      if (notes) log.verificationNotes = notes;

      // If verified, update the actualQuantityExecuted on the parent activity
      if (status === "VERIFIED") {
        const activity = store.progressActivities.get(log.activityId);
        if (activity) {
          activity.actualQuantityExecuted += log.quantityRecorded;
          if (activity.actualQuantityExecuted >= activity.plannedQuantity) {
            activity.status = "COMPLETED";
          } else {
            activity.status = "IN_EXECUTION";
          }
          activity.updatedAt = new Date();
        }
      }

      return log;
    });
  }

  // ----------------------------------------------------------------------------
  // 5. DELAY REPORTING & MITIGATION
  // ----------------------------------------------------------------------------

  public async reportDelay(delay: DbProjectDelayRecord): Promise<DbProjectDelayRecord> {
    const store = db.getStore();
    store.delayRecords.set(delay.id, delay);
    return delay;
  }

  public async getDelayRecords(projectId: string): Promise<DbProjectDelayRecord[]> {
    const store = db.getStore();
    return Array.from(store.delayRecords.values())
      .filter((d) => d.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async resolveDelay(
    delayId: string,
    notes?: string
  ): Promise<DbProjectDelayRecord | null> {
    return db.transaction(async (store) => {
      const delay = store.delayRecords.get(delayId);
      if (!delay) return null;

      delay.status = "RESOLVED";
      delay.resolvedAt = new Date();
      if (notes) delay.mitigationAction += ` | Resolution: ${notes}`;

      return delay;
    });
  }

  // ----------------------------------------------------------------------------
  // 6. FINANCIAL EXPENSES & BUDGET ROLLUP
  // ----------------------------------------------------------------------------

  public async recordExpense(expense: DbProjectExpense): Promise<DbProjectExpense> {
    const store = db.getStore();
    store.projectExpenses.set(expense.id, expense);
    return expense;
  }

  public async getProjectExpenses(projectId: string): Promise<DbProjectExpense[]> {
    const store = db.getStore();
    return Array.from(store.projectExpenses.values())
      .filter((e) => e.projectId === projectId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  public async calculateProjectFinancials(project: DbProject): Promise<FinancialPerformance> {
    const expenses = await this.getProjectExpenses(project.id);

    let labourCost = 0;
    let materialCost = 0;
    let equipmentCost = 0;
    let contractorCost = 0;
    let overheadCost = 0;

    for (const exp of expenses) {
      switch (exp.costCategory) {
        case "LABOUR":
          labourCost += exp.amount;
          break;
        case "MATERIAL":
          materialCost += exp.amount;
          break;
        case "EQUIPMENT":
          equipmentCost += exp.amount;
          break;
        case "CONTRACTOR":
          contractorCost += exp.amount;
          break;
        case "PERMITS_OVERHEAD":
          overheadCost += exp.amount;
          break;
      }
    }

    const totalActualExpenses = labourCost + materialCost + equipmentCost + contractorCost + overheadCost;
    const remainingBudget = project.budget - totalActualExpenses;
    const budgetVarianceAmount = remainingBudget; // Positive = under budget envelope
    const budgetVariancePercent = project.budget > 0
      ? Math.round(((project.budget - totalActualExpenses) / project.budget) * 1000) / 10
      : 0;

    let costOverrunRisk: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";
    const spentPercent = project.budget > 0 ? (totalActualExpenses / project.budget) * 100 : 0;
    const progress = project.overallProgressPercent || 0;

    if (spentPercent > 100) {
      costOverrunRisk = "CRITICAL";
    } else if (spentPercent > progress + 15) {
      costOverrunRisk = "HIGH";
    } else if (spentPercent > progress + 5) {
      costOverrunRisk = "MODERATE";
    }

    return {
      approvedBudget: project.budget,
      contractValue: project.contractValue,
      totalActualExpenses,
      labourCost,
      materialCost,
      equipmentCost,
      contractorCost,
      overheadCost,
      remainingBudget,
      budgetVarianceAmount,
      budgetVariancePercent,
      costOverrunRisk,
    };
  }

  // ----------------------------------------------------------------------------
  // 7. COMPREHENSIVE PROJECT DASHBOARD & DETAIL DOSSAGE
  // ----------------------------------------------------------------------------

  public async getProjectDashboard(projectId: string): Promise<ProjectDashboardData | null> {
    const project = await this.findProjectById(projectId);
    if (!project) return null;

    const store = db.getStore();

    // Manager
    let projectManager: ProjectDashboardData["projectManager"];
    if (project.projectManagerId) {
      const emp = store.employees.get(project.projectManagerId);
      if (emp) {
        projectManager = {
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          email: emp.email || undefined,
          phone: emp.phone,
        };
      }
    }

    // Schedule Timeline
    const start = new Date(project.startDate).getTime();
    const end = new Date(project.plannedEndDate).getTime();
    const now = Date.now();
    const totalDays = Math.max(1, Math.round((end - start) / (24 * 3600 * 1000)));
    const daysElapsed = Math.max(0, Math.round((now - start) / (24 * 3600 * 1000)));
    const daysRemaining = Math.max(0, Math.round((end - now) / (24 * 3600 * 1000)));
    const timelinePercent = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));

    const tasks = await this.getProjectTasks(projectId);
    const milestones = tasks.filter((t) => t.isMilestone);
    const milestonesAchieved = milestones.filter((t) => t.status === "COMPLETED").length;

    // Delayed tasks check: plannedEndDate has passed, but task is not completed
    const delayedTasksCount = tasks.filter(
      (t) => t.status !== "COMPLETED" && new Date(t.plannedEndDate).getTime() < now
    ).length;

    // Financials
    const financials = await this.calculateProjectFinancials(project);

    // Workforce deployed
    const assignedSitesCount = project.assignedSiteIds?.length || 0;
    const assignedEngineersCount = project.assignedEmployeeIds?.length || 0;
    const assignedLabourersCount = project.assignedLabourerIds?.length || 0;

    // Active contractors assigned to project tasks
    const contractorIds = new Set<string>();
    tasks.forEach((t) => {
      if (t.assignedContractorId) contractorIds.add(t.assignedContractorId);
    });

    // Activities
    const activities = await this.getProgressActivities(projectId);
    const inExecutionCount = activities.filter((a) => a.status === "IN_EXECUTION").length;
    const completedCount = activities.filter((a) => a.status === "COMPLETED").length;

    let totalExecutionPct = 0;
    activities.forEach((a) => {
      if (a.plannedQuantity > 0) {
        totalExecutionPct += Math.min(100, (a.actualQuantityExecuted / a.plannedQuantity) * 100);
      }
    });
    const averageExecutionPercent = activities.length > 0 ? Math.round(totalExecutionPct / activities.length) : 0;

    // Measurement Logs & Delays
    const measurementLogs = await this.getMeasurementLogs(projectId);
    const pendingMeasurements = measurementLogs.filter((l) => l.verificationStatus === "PENDING").length;

    const delayRecords = await this.getDelayRecords(projectId);
    const openDelays = delayRecords.filter((d) => d.status !== "RESOLVED").length;

    // Determine Health Status
    let healthStatus: "ON_TRACK" | "AT_RISK" | "DELAYED" = project.healthStatus || "ON_TRACK";
    if (delayedTasksCount > 2 || openDelays > 1 || financials.costOverrunRisk === "CRITICAL") {
      healthStatus = "DELAYED";
    } else if (delayedTasksCount > 0 || financials.costOverrunRisk === "HIGH") {
      healthStatus = "AT_RISK";
    }

    return {
      project,
      projectManager,
      overallProgressPercent: project.overallProgressPercent || averageExecutionPercent,
      healthStatus,
      schedule: {
        startDate: new Date(project.startDate).toISOString().slice(0, 10),
        plannedEndDate: new Date(project.plannedEndDate).toISOString().slice(0, 10),
        totalDays,
        daysElapsed,
        daysRemaining,
        timelinePercent,
        milestonesTotal: milestones.length,
        milestonesAchieved,
        delayedTasksCount,
      },
      financials,
      workforce: {
        assignedSitesCount,
        assignedEngineersCount,
        assignedLabourersCount,
        activeContractorsCount: contractorIds.size,
        totalMusterDeployed: assignedEngineersCount + assignedLabourersCount,
      },
      progressActivitiesSummary: {
        totalActivities: activities.length,
        inExecutionCount,
        completedCount,
        averageExecutionPercent,
      },
      pendingApprovalsCount: {
        measurementLogs: pendingMeasurements,
        openDelays,
        total: pendingMeasurements + openDelays,
      },
      recentActivities: activities.slice(0, 5),
      recentMeasurements: measurementLogs.slice(0, 5),
      recentDelays: delayRecords.slice(0, 5),
    };
  }

  public async getProjectDetailFull(projectId: string): Promise<ProjectDetailFull | null> {
    const project = await this.findProjectById(projectId);
    if (!project) return null;

    const store = db.getStore();

    // Manager
    let projectManager: ProjectDetailFull["projectManager"];
    if (project.projectManagerId) {
      const emp = store.employees.get(project.projectManagerId);
      if (emp) {
        projectManager = {
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          email: emp.email || undefined,
          phone: emp.phone,
        };
      }
    }

    // Sites
    const sites = Array.from(store.sites.values()).filter((s) => s.projectId === projectId);

    // Employees
    const assignedEmployees = (project.assignedEmployeeIds || [])
      .map((id) => store.employees.get(id))
      .filter((e): e is NonNullable<typeof e> => Boolean(e))
      .map((e) => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName}`,
        code: e.employeeCode,
        designation: e.designationId ? store.designations.get(e.designationId)?.title : undefined,
      }));

    // Labourers
    const assignedLabourers = (project.assignedLabourerIds || [])
      .map((id) => store.labourers.get(id))
      .filter((l): l is NonNullable<typeof l> => Boolean(l))
      .map((l) => ({
        id: l.id,
        name: `${l.firstName} ${l.lastName}`,
        code: l.labourerCode,
        trade: l.primaryTrade,
        skillLevel: l.skillLevel,
      }));

    const documents = await this.getProjectDocuments(projectId);
    const history = await this.getProjectHistory(projectId);

    return {
      project,
      projectManager,
      sites,
      assignedEmployees,
      assignedLabourers,
      documents,
      history,
    };
  }
}

export const projectRepository = new ProjectRepository();
