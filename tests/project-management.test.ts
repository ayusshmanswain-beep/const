// ==============================================================================
// CONSTRUCT360 PROJECT MANAGEMENT TEST SUITE
// Automated Unit & Integration Tests for Projects, WBS, Gantt, BOQ Progress & Costs
// ==============================================================================

import assert from "node:assert/strict";
import test from "node:test";
import type { SecurityContext } from "../src/server/auth/context";
import { ForbiddenError, BadRequestError, NotFoundError } from "../src/server/core/errors/app-error";
import { dataStore } from "../src/server/db/store";
import { projectService } from "../src/server/modules/project/project.service";

// Helper to construct SecurityContext for testing
function createMockContext(userId: string, isSuperAdmin = false): SecurityContext {
  const store = dataStore;
  const user = store.users.get(userId)!;
  if (!user) throw new Error(`User not found: ${userId}`);

  const membership = Array.from(store.memberships.values()).find((m) => m.userId === userId)!;
  if (!membership) throw new Error(`Membership not found for user: ${userId}`);
  const companyId = membership.companyId;

  const permissions = new Set<string>();
  const userRoles = Array.from(store.userRoles.values()).filter((ur) => ur.userId === userId);

  for (const ur of userRoles) {
    for (const rp of store.rolePermissions.values()) {
      if (rp.roleId === ur.roleId) {
        const perm = store.permissions.get(rp.permissionId);
        if (perm) {
          permissions.add(perm.code.toLowerCase());
        }
      }
    }
  }

  return {
    user,
    session: {
      id: "mock_session_id",
      userId,
      refreshTokenHash: "mock_hash",
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
    },
    companyId,
    isSuperAdmin,
    roles: userRoles.map((ur) => ({
      roleId: ur.roleId,
      roleSlug: store.roles.get(ur.roleId)?.slug || "",
      roleName: store.roles.get(ur.roleId)?.name || "",
      projectId: ur.projectId,
    })),
    permissions,
  };
}

const APEX_COMPANY_ID = "c0000001-0000-0000-0000-000000000001";
const ADMIN_USER_ID = "u0000002-0000-0000-0000-000000000002"; // Rajesh Menon (Admin/VP)
const MANAGER_USER_ID = "u0000003-0000-0000-0000-000000000003"; // Priya Sharma (Project Manager on Skyline)
const ENGINEER_USER_ID = "u0000004-0000-0000-0000-000000000004"; // Vikram Singh (Site Engineer on Skyline)
const SKYLINE_PROJECT_ID = "a0000001-0000-0000-0000-000000000001";

test("Project Management: Project Creation & Automatic Sequence Generation", async () => {
  const adminCtx = createMockContext(ADMIN_USER_ID);

  const newProject = await projectService.createProject(
    {
      name: "Metro Elevated Corridor Line 3",
      description: "Urban transit elevated viaduct spanning 12.4 km with 8 stations",
      clientName: "Bangalore Metro Rail Corporation Ltd",
      clientContactPerson: "Sunil Kumar (Chief Engineer)",
      clientEmail: "sunil.kumar@bmrc.gov.in",
      clientPhone: "+919876599901",
      contractValue: 1250000000,
      budget: 1100000000,
      startDate: "2026-06-01",
      plannedEndDate: "2028-12-31",
    },
    adminCtx
  );

  assert.ok(newProject.id, "New project must receive a valid UUID");
  assert.equal(newProject.projectCode, "PRJ-APEX-002", "Project code must be sequentially generated as PRJ-APEX-002");
  assert.equal(newProject.status, "PLANNING", "Default initial status must be PLANNING");
  assert.equal(newProject.healthStatus, "ON_TRACK", "Default initial health status must be ON_TRACK");
  assert.equal(newProject.overallProgressPercent, 0, "Initial progress must be 0%");
  assert.equal(newProject.companyId, APEX_COMPANY_ID, "Project must be isolated to Apex company");
});

test("Project Management: Project-Scoped RBAC Access Control Enforcement", async () => {
  const adminCtx = createMockContext(ADMIN_USER_ID); // Company-wide admin
  const managerCtx = createMockContext(MANAGER_USER_ID); // Scoped to Skyline
  const engineerCtx = createMockContext(ENGINEER_USER_ID); // Scoped to Skyline

  // 1. Authorized project access
  const skylineForManager = await projectService.getProject(SKYLINE_PROJECT_ID, managerCtx);
  assert.equal(skylineForManager.project.id, SKYLINE_PROJECT_ID);

  // 2. Create another project that Priya and Vikram are not assigned to
  const secretProject = await projectService.createProject(
    {
      name: "Confidential Defense Lab Facility",
      clientName: "DRDO India",
      contractValue: 500000000,
      budget: 450000000,
      startDate: "2026-07-01",
      plannedEndDate: "2027-12-31",
    },
    adminCtx
  );

  // 3. Admin can view the confidential project
  const secretForAdmin = await projectService.getProject(secretProject.id, adminCtx);
  assert.equal(secretForAdmin.project.id, secretProject.id);

  // 4. Project Manager Priya (scoped only to Skyline) is forbidden from viewing the other project
  await assert.rejects(
    async () => {
      await projectService.getProject(secretProject.id, managerCtx);
    },
    (err: any) => {
      assert.ok(err instanceof ForbiddenError, "Must throw ForbiddenError");
      assert.match(err.message, /Access denied to project/);
      return true;
    }
  );

  // 5. Site Engineer Vikram is also forbidden
  await assert.rejects(
    async () => {
      await projectService.getProject(secretProject.id, engineerCtx);
    },
    (err: any) => {
      assert.ok(err instanceof ForbiddenError, "Must throw ForbiddenError");
      assert.match(err.message, /Access denied to project/);
      return true;
    }
  );
});

test("Project Management: Work Breakdown Structure (WBS) & Task Hierarchy", async () => {
  const adminCtx = createMockContext(ADMIN_USER_ID);

  // 1. Create a root WBS node
  const rootNode = await projectService.createWbsNode(
    {
      projectId: SKYLINE_PROJECT_ID,
      wbsCode: "3.0",
      name: "Finishes & MEP Services",
      description: "Internal and external MEP, flooring and glazing",
      orderIndex: 3,
    },
    adminCtx
  );
  assert.equal(rootNode.wbsCode, "3.0");

  // 2. Create a child WBS node
  const childNode = await projectService.createWbsNode(
    {
      projectId: SKYLINE_PROJECT_ID,
      wbsCode: "3.1",
      name: "Electrical & Fire Alarm Distribution",
      parentWbsId: rootNode.id,
      orderIndex: 1,
    },
    adminCtx
  );
  assert.equal(childNode.parentWbsId, rootNode.id);

  // 3. Create a task under child node
  const task = await projectService.createTask(
    {
      projectId: SKYLINE_PROJECT_ID,
      wbsNodeId: childNode.id,
      title: "Main Switchgear & Transformer Energization",
      priority: "CRITICAL",
      isMilestone: true,
      milestoneTitle: "Power Grid Energization",
      plannedStartDate: "2026-09-01",
      plannedEndDate: "2026-09-15",
      plannedManHours: 120,
    },
    adminCtx
  );
  assert.ok(task.taskCode.startsWith("TSK-"), "Task must have a sequential task code");
  assert.equal(task.priority, "CRITICAL");
  assert.equal(task.isMilestone, true);

  // 4. Retrieve WBS Tree and verify hierarchy
  const tree = await projectService.getWbsTree(SKYLINE_PROJECT_ID, adminCtx);
  const foundRoot = tree.find((n) => n.id === rootNode.id);
  assert.ok(foundRoot, "Root node 3.0 must exist in WBS tree");
  assert.equal(foundRoot.children?.length, 1, "Root node must contain child node 3.1");
  assert.equal(foundRoot.children[0].tasks.length, 1, "Child node must contain the created switchgear task");
});

test("Project Management: Task Dependencies & Circular Dependency Prevention", async () => {
  const adminCtx = createMockContext(ADMIN_USER_ID);

  // Retrieve existing tasks from seed
  const tree = await projectService.getWbsTree(SKYLINE_PROJECT_ID, adminCtx);
  const allTasks = tree.flatMap((n) => [...n.tasks, ...(n.children || []).flatMap((c) => c.tasks)]);
  assert.ok(allTasks.length >= 2, "Seed must contain tasks");

  const taskA = allTasks[0];
  const taskB = allTasks[1];

  // Self-dependency rejection
  await assert.rejects(
    async () => {
      await projectService.addTaskDependency(
        {
          projectId: SKYLINE_PROJECT_ID,
          taskId: taskA.id,
          predecessorTaskId: taskA.id,
        },
        adminCtx
      );
    },
    (err: any) => {
      assert.ok(err instanceof BadRequestError);
      assert.match(err.message, /cannot depend upon itself/);
      return true;
    }
  );

  // Create two dedicated new tasks for circular cycle test
  const node = tree[0];
  const cycleTask1 = await projectService.createTask(
    {
      projectId: SKYLINE_PROJECT_ID,
      wbsNodeId: node.id,
      title: "Cycle Test Task 1",
      plannedStartDate: "2026-10-01",
      plannedEndDate: "2026-10-05",
    },
    adminCtx
  );

  const cycleTask2 = await projectService.createTask(
    {
      projectId: SKYLINE_PROJECT_ID,
      wbsNodeId: node.id,
      title: "Cycle Test Task 2",
      plannedStartDate: "2026-10-06",
      plannedEndDate: "2026-10-10",
    },
    adminCtx
  );

  // 1. Link cycleTask2 -> cycleTask1 (cycleTask2 depends on cycleTask1)
  const validDep = await projectService.addTaskDependency(
    {
      projectId: SKYLINE_PROJECT_ID,
      taskId: cycleTask2.id,
      predecessorTaskId: cycleTask1.id,
      dependencyType: "FINISH_TO_START",
      lagDays: 1,
    },
    adminCtx
  );
  assert.equal(validDep.taskId, cycleTask2.id);
  assert.equal(validDep.predecessorTaskId, cycleTask1.id);

  // 2. Attempt circular edge: cycleTask1 -> cycleTask2 (cycleTask1 depends on cycleTask2)
  await assert.rejects(
    async () => {
      await projectService.addTaskDependency(
        {
          projectId: SKYLINE_PROJECT_ID,
          taskId: cycleTask1.id,
          predecessorTaskId: cycleTask2.id,
        },
        adminCtx
      );
    },
    (err: any) => {
      assert.ok(err instanceof BadRequestError);
      assert.match(err.message, /Circular dependency detected/);
      return true;
    }
  );
});

test("Project Management: BOQ Progress Tracking & Field Measurement Sign-Off", async () => {
  const adminCtx = createMockContext(ADMIN_USER_ID);
  const engineerCtx = createMockContext(ENGINEER_USER_ID);

  // 1. Create a BOQ progress activity
  const activity = await projectService.createProgressActivity(
    {
      projectId: SKYLINE_PROJECT_ID,
      activityCode: "ACT-TEST-REBAR-01",
      activityName: "Fe500D High Tensile Rebar Binding - Level 5 Columns",
      trade: "STEEL",
      measurementUnit: "MT",
      plannedQuantity: 40,
      ratePerUnit: 78000,
    },
    adminCtx
  );
  assert.equal(activity.activityCode, "ACT-TEST-REBAR-01");
  assert.equal(activity.actualQuantityExecuted, 0);
  assert.equal(activity.status, "PLANNED");

  // 2. Engineer logs a field progress measurement of 15 MT
  const log = await projectService.logProgressMeasurement(
    {
      projectId: SKYLINE_PROJECT_ID,
      activityId: activity.id,
      measurementDate: "2026-08-10",
      quantityRecorded: 15,
      locationDescription: "Columns C1 to C8 Level 5",
      sitePhotoUrls: ["https://storage.construct360.internal/evidence/rebar-l5.jpg"],
    },
    engineerCtx
  );
  assert.equal(log.quantityRecorded, 15);
  assert.equal(log.verificationStatus, "PENDING", "Initial log status must be PENDING");

  // 3. Engineer / PM verifies the measurement
  const verifiedLog = await projectService.verifyProgressMeasurement(
    {
      logId: log.id,
      status: "VERIFIED",
      notes: "Physical bar count and lap lengths verified against BBS drawing Rev 2.",
    },
    engineerCtx
  );
  assert.equal(verifiedLog.verificationStatus, "VERIFIED");
  assert.equal(verifiedLog.verifiedByUserId, engineerCtx.user.id);

  // 4. Verify parent activity updated cumulative executed quantity to 15 MT
  const activities = await projectService.getProgressActivities(SKYLINE_PROJECT_ID, adminCtx);
  const updatedAct = activities.find((a) => a.id === activity.id);
  assert.ok(updatedAct);
  assert.equal(updatedAct.actualQuantityExecuted, 15, "Executed quantity must increment to 15 MT");
  assert.equal(updatedAct.status, "IN_EXECUTION");
});

test("Project Management: Delay Reporting & Schedule Impact Mitigation", async () => {
  const adminCtx = createMockContext(ADMIN_USER_ID);

  // 1. Report a site delay event
  const delay = await projectService.reportDelay(
    {
      projectId: SKYLINE_PROJECT_ID,
      delayReasonCategory: "WEATHER_MONSOON",
      delayDaysImpact: 5,
      title: "Severe Basement Inundation Following Cloudburst",
      description: "Basement 2 submerged under 1.2m water, halting raft de-shuttering",
      mitigationAction: "Mobilized 3 high-capacity submersible dewatering pumps and deployed night salvage crew",
      isCriticalPathImpact: true,
    },
    adminCtx
  );
  assert.equal(delay.status, "OPEN");
  assert.equal(delay.delayDaysImpact, 5);
  assert.equal(delay.isCriticalPathImpact, true);

  // 2. Resolve delay with mitigation notes
  const resolved = await projectService.resolveDelay(
    {
      delayId: delay.id,
      mitigationNotes: "Water evacuated within 36 hours. Silt cleaned and structural engineers passed raft inspection.",
    },
    adminCtx
  );
  assert.equal(resolved.status, "RESOLVED");
  assert.ok(resolved.resolvedAt);
  assert.match(resolved.mitigationAction, /Resolution: Water evacuated/);
});

test("Project Management: Financial Performance, Multi-Category Cost Rollup & Budget Variance", async () => {
  const adminCtx = createMockContext(ADMIN_USER_ID);

  // 1. Record an equipment expense
  const exp = await projectService.recordProjectExpense(
    {
      projectId: SKYLINE_PROJECT_ID,
      costCategory: "EQUIPMENT",
      title: "Tower Crane 01 Monthly Lease & Fuel",
      amount: 450000,
      vendorOrBeneficiary: "Action Construction Equipment Ltd",
      referenceType: "EQUIPMENT_RENTAL",
      referenceId: "RENT-2026-088",
      notes: "Includes certified operator charges",
    },
    adminCtx
  );
  assert.equal(exp.costCategory, "EQUIPMENT");
  assert.equal(exp.amount, 450000);

  // 2. Retrieve project financials
  const financials = await projectService.getProjectFinancials(SKYLINE_PROJECT_ID, adminCtx);
  assert.ok(financials.approvedBudget > 0, "Approved budget must be positive");
  assert.ok(financials.totalActualExpenses > 0, "Total expenses must reflect seed & new expenses");
  assert.ok(financials.equipmentCost >= 450000, "Equipment cost must include the newly booked lease");
  assert.equal(
    financials.totalActualExpenses,
    financials.labourCost + financials.materialCost + financials.equipmentCost + financials.contractorCost + financials.overheadCost,
    "Total expenses must match the sum of all 5 cost categories"
  );
  assert.equal(financials.remainingBudget, financials.approvedBudget - financials.totalActualExpenses);
});

test("Project Management: Executive Project Command Dashboard Aggregation", async () => {
  const adminCtx = createMockContext(ADMIN_USER_ID);

  const dashboard = await projectService.getProjectDashboard(SKYLINE_PROJECT_ID, adminCtx);

  // Verify project core
  assert.equal(dashboard.project.id, SKYLINE_PROJECT_ID);
  assert.equal(dashboard.project.projectCode, "PRJ-SKY-001");
  assert.ok(dashboard.project.budget > 0);

  // Verify schedule velocity
  assert.ok(dashboard.schedule.totalDays > 0);
  assert.ok(dashboard.schedule.daysElapsed >= 0);
  assert.ok(dashboard.schedule.timelinePercent >= 0);
  assert.ok(dashboard.schedule.milestonesTotal >= 2);

  // Verify financial summary
  assert.ok(dashboard.financials.totalActualExpenses > 0);
  assert.ok(["LOW", "MODERATE", "HIGH", "CRITICAL"].includes(dashboard.financials.costOverrunRisk));

  // Verify workforce deployment
  assert.ok(dashboard.workforce.assignedEngineersCount >= 1);
  assert.ok(dashboard.workforce.assignedLabourersCount >= 1);
});
