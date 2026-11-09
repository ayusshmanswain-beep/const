// ==============================================================================
// CONSTRUCT360 WORKFORCE MANAGEMENT TEST SUITE
// Automated Unit & Integration Tests for Employees, Labourers, Contractors & Portal
// ==============================================================================

import assert from "node:assert/strict";
import test from "node:test";
import type { SecurityContext } from "../src/server/auth/context";
import { dataStore } from "../src/server/db/store";
import { workforceService } from "../src/server/modules/workforce/workforce.service";

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

const ADMIN_USER_ID = "u0000002-0000-0000-0000-000000000002"; // Rajesh Menon (Admin/VP)
const ENGINEER_USER_ID = "u0000004-0000-0000-0000-000000000004"; // Vikram Singh (Site Engineer)
const SITE_A_ID = "s0000001-0000-0000-0000-000000000001";
const SITE_B_ID = "s0000002-0000-0000-0000-000000000002";
const EMP_SURESH_ID = "e0000003-0000-0000-0000-000000000003";
const EMP_VIKRAM_ID = "e0000002-0000-0000-0000-000000000002";

test("Workforce: Employee Registration & Automatic ID Sequence Generation", async () => {
  const adminCtx = createMockContext(ADMIN_USER_ID);

  // Initial seed has EMP-APEX-001 through EMP-APEX-004.
  // Register first new employee
  const emp1 = await workforceService.createEmployee(
    {
      firstName: "Rohan",
      lastName: "Gupta",
      email: "rohan.gupta@apexinfra.com",
      phone: "+91 99887 76655",
      employmentType: "PERMANENT",
      joiningDate: "2025-03-01",
      baseSalary: 75000,
      hra: 30000,
      siteAllowance: 12000,
      emergencyContactName: "Pooja Gupta",
      emergencyContactPhone: "+91 99887 76656",
      emergencyContactRelation: "Spouse",
    },
    adminCtx
  );

  assert.equal(emp1.employeeCode, "EMP-APEX-005", "First new employee code must be EMP-APEX-005");
  assert.equal(emp1.status, "ACTIVE");
  assert.equal(emp1.firstName, "Rohan");

  // Verify salary structure was created
  const profile1 = await workforceService.getEmployee(emp1.id, adminCtx);
  assert.ok(profile1.salaryStructure, "Salary structure must be linked to newly created employee");
  assert.equal(profile1.salaryStructure.baseSalary, 75000);
  assert.equal(profile1.salaryStructure.hra, 30000);

  // Register second new employee to verify auto-increment sequence
  const emp2 = await workforceService.createEmployee(
    {
      firstName: "Neha",
      lastName: "Kapoor",
      email: "neha.kapoor@apexinfra.com",
      phone: "+91 99887 76657",
      employmentType: "PROBATION",
      joiningDate: "2025-03-15",
    },
    adminCtx
  );

  assert.equal(emp2.employeeCode, "EMP-APEX-006", "Second employee code must increment to EMP-APEX-006");
});

test("Workforce: Employee Profile Lifecycle Updates & History Audit Log", async () => {
  const adminCtx = createMockContext(ADMIN_USER_ID);

  // Target existing seeded employee Suresh Kumar (EMP_SURESH_ID)
  const emp = await workforceService.getEmployee(EMP_SURESH_ID, adminCtx);
  assert.equal(emp.firstName, "Suresh");

  // Update status to ON_NOTICE with reason
  const updated = await workforceService.updateEmployee(
    emp.id,
    {
      status: "ON_NOTICE",
      phone: "+91 98765 43219",
      reason: "Serving 30-day notice period for career transition",
    },
    adminCtx
  );

  assert.equal(updated.status, "ON_NOTICE");
  assert.equal(updated.phone, "+91 98765 43219");

  // Verify history audit record
  const freshProfile = await workforceService.getEmployee(emp.id, adminCtx);
  const statusHistory = freshProfile.history.find(
    (h) => h.eventType === "STATUS_CHANGE" && h.newValue === "ON_NOTICE"
  );
  assert.ok(statusHistory, "History must capture the status change to ON_NOTICE");
  assert.equal(statusHistory.newValue, "ON_NOTICE");
  assert.equal(statusHistory.oldValue, "ACTIVE");
});

test("Workforce: Document Upload & Verification Workflow Transitions", async () => {
  const adminCtx = createMockContext(ADMIN_USER_ID);

  // 1. Upload Aadhaar document for Vikram Singh
  const doc = await workforceService.addEmployeeDocument(
    EMP_VIKRAM_ID,
    {
      documentType: "AADHAAR_CARD",
      title: "Government Aadhaar Card Copy",
      fileName: "aadhaar_vikram_singh.pdf",
      fileUrl: "https://vault.construct360.local/docs/aadhaar_vikram.pdf",
    },
    adminCtx
  );

  assert.equal(doc.verificationStatus, "PENDING", "Initial document status must be PENDING");
  assert.equal(doc.employeeId, EMP_VIKRAM_ID);

  // 2. Supervisor verifies document
  const verifiedDoc = await workforceService.verifyEmployeeDocument(
    doc.id,
    "VERIFIED",
    undefined,
    adminCtx
  );

  assert.equal(verifiedDoc.verificationStatus, "VERIFIED");
  assert.equal(verifiedDoc.verifiedByUserId, adminCtx.user.id);
  assert.ok(verifiedDoc.verifiedAt, "verifiedAt timestamp must be recorded");

  // 3. Upload and reject another document
  const doc2 = await workforceService.addEmployeeDocument(
    EMP_VIKRAM_ID,
    {
      documentType: "POLICE_VERIFICATION",
      title: "Police Clearance Certificate",
      fileName: "pcc_expired.pdf",
      fileUrl: "https://vault.construct360.local/docs/pcc.pdf",
    },
    adminCtx
  );

  const rejectedDoc = await workforceService.verifyEmployeeDocument(
    doc2.id,
    "REJECTED",
    "Police clearance certificate expired over 6 months ago",
    adminCtx
  );

  assert.equal(rejectedDoc.verificationStatus, "REJECTED");
  assert.equal(rejectedDoc.rejectionReason, "Police clearance certificate expired over 6 months ago");
});

test("Workforce: Bulk CSV Import & Export Capabilities", async () => {
  const adminCtx = createMockContext(ADMIN_USER_ID);

  const csvPayload = `firstName,lastName,email,phone,employmentType,joiningDate,baseSalary
Amit,Verma,amit.verma@apexinfra.com,+91 91234 56789,PERMANENT,2025-04-01,92000
Deepa,Nambiar,deepa.n@apexinfra.com,+91 91234 56780,TEMPORARY,2025-04-05,58000
,InvalidUser,,123,UNKNOWN,,`; // Row with errors

  const importResult = await workforceService.bulkImportEmployees(csvPayload, adminCtx);

  assert.equal(importResult.totalProcessed, 3, "Total rows parsed must be 3");
  assert.equal(importResult.successCount, 2, "2 valid rows must be imported");
  assert.equal(importResult.failedCount, 1, "1 row must fail validation");
  assert.ok(importResult.errors.length > 0, "Errors list must specify invalid rows");
  assert.equal(importResult.errors[0].row, 4);

  // Test CSV Export
  const csvExport = await workforceService.exportEmployeesCsv(adminCtx);
  assert.ok(csvExport.includes("Employee Code"), "Export CSV must have headers");
  assert.ok(csvExport.includes("Amit Verma"), "Exported CSV must contain imported employee Amit Verma");
  assert.ok(csvExport.includes("Deepa Nambiar"), "Exported CSV must contain Deepa Nambiar");
});

test("Workforce: Daily-Wage Labourer Registration & Sequential ID Generation", async () => {
  const adminCtx = createMockContext(ADMIN_USER_ID);

  // Initial seed has LAB-001 through LAB-005. Next is LAB-006.
  const lab = await workforceService.createLabourer(
    {
      firstName: "Dharmendra",
      lastName: "Kushwaha",
      phone: "+91 97766 55443",
      skillLevel: "SKILLED",
      primaryTrade: "BAR_BENDER",
      dailyWageRate: 850,
      hourlyWageRate: 110,
      pieceRateWage: 0,
      groupName: "Gang-Bravo",
      currentSiteId: SITE_A_ID,
    },
    adminCtx
  );

  assert.equal(lab.labourerCode, "LAB-006", "Generated labourer code must be LAB-006");
  assert.equal(lab.primaryTrade, "BAR_BENDER");
  assert.equal(lab.dailyWageRate, 850);
  assert.equal(lab.availabilityStatus, "AVAILABLE");
  assert.equal(lab.isActive, true);

  // Verify retrieval
  const fetched = await workforceService.getLabourer(lab.id, adminCtx);
  assert.equal(fetched.firstName, "Dharmendra");
  assert.equal(fetched.currentSiteId, SITE_A_ID);
});

test("Workforce: Authoritative Wage Computation with Overtime & Advance Deductions", async () => {
  const adminCtx = createMockContext(ADMIN_USER_ID);

  // Create a labourer with daily wage 900 and overtime 150/hr
  const lab = await workforceService.createLabourer(
    {
      firstName: "Kailash",
      lastName: "Yadav",
      phone: "+91 96655 44332",
      skillLevel: "HIGHLY_SKILLED",
      primaryTrade: "WELDER",
      dailyWageRate: 900,
      hourlyWageRate: 150,
    },
    adminCtx
  );

  // 1. Initial wage computation: 20 days worked, 10 overtime hours
  // Basic: 20 * 900 = 18,000. Overtime (1.5x multiplier): 10 * 150 * 1.5 = 2,250. Gross: 20,250.
  const initialWage = await workforceService.calculateWage(lab.id, 20, 10, 0, adminCtx);
  assert.equal(initialWage.basicWages, 18000);
  assert.equal(initialWage.overtimeWages, 2250);
  assert.equal(initialWage.grossWages, 20250);
  assert.equal(initialWage.advancesDeducted, 0);
  assert.equal(initialWage.netWagePayable, 20250);

  // 2. Worker requests an advance of ₹3,500
  const advance = await workforceService.requestAdvance(
    {
      labourerId: lab.id,
      amount: 3500,
      reason: "Emergency medical treatment",
    },
    adminCtx
  );

  assert.equal(advance.status, "PENDING");

  // 3. Supervisor approves advance
  await workforceService.reviewAdvance(
    {
      advanceId: advance.id,
      decision: "APPROVED",
    },
    adminCtx
  );

  // 4. Recalculate wage -> advance of 3,500 must be deducted automatically
  const updatedWage = await workforceService.calculateWage(lab.id, 20, 10, 0, adminCtx);
  assert.equal(updatedWage.grossWages, 20250);
  assert.equal(updatedWage.advancesDeducted, 3500, "Approved advance of ₹3,500 must be deducted");
  assert.equal(updatedWage.netWagePayable, 16750, "Net wage payable must be 20,250 - 3,500 = 16,750");
});

test("Workforce: Labourer Site Transfer Workflow", async () => {
  const adminCtx = createMockContext(ADMIN_USER_ID);

  const lab = await workforceService.createLabourer(
    {
      firstName: "Bhola",
      lastName: "Prasad",
      skillLevel: "SEMI_SKILLED",
      primaryTrade: "CARPENTER",
      dailyWageRate: 700,
      currentSiteId: SITE_A_ID,
    },
    adminCtx
  );

  assert.equal(lab.currentSiteId, SITE_A_ID);

  // Transfer worker to Site B
  const transfer = await workforceService.transferWorker(
    {
      labourerId: lab.id,
      toSiteId: SITE_B_ID,
      transferDate: "2025-05-01",
      reason: "Urgent formwork shuttering mobilization",
    },
    adminCtx
  );

  assert.equal(transfer.fromSiteId, SITE_A_ID);
  assert.equal(transfer.toSiteId, SITE_B_ID);
  assert.equal(transfer.status, "APPROVED");

  // Verify labourer's current site is updated
  const refreshed = await workforceService.getLabourer(lab.id, adminCtx);
  assert.equal(refreshed.currentSiteId, SITE_B_ID);
});

test("Workforce: Contractor Lifecycle, Periodic RA Billing & Payment Disbursal", async () => {
  const adminCtx = createMockContext(ADMIN_USER_ID);

  // 1. Register new contractor
  const contractor = await workforceService.createContractor(
    {
      businessName: "Mahalaxmi Steel Fabricators LLP",
      contractorType: "STEEL_FABRICATION",
      contactPerson: "Mahesh Sharma",
      phone: "+91 94433 22110",
      email: "contact@mahalaxmisteel.in",
      contractValidFrom: "2025-01-01",
      contractValidTo: "2025-12-31",
      panNumber: "AABCM1234D",
      taxId: "29AABCM1234D1Z5",
    },
    adminCtx
  );

  assert.equal(contractor.contractorCode, "CONT-03", "Auto ID sequence must yield CONT-03");
  assert.equal(contractor.contractorType, "STEEL_FABRICATION");

  // 2. Submit periodic RA bill: Gross ₹500,000, Deductions ₹25,000 -> Net ₹475,000
  const bill = await workforceService.submitContractorBill(
    {
      contractorId: contractor.id,
      billNumber: "MSF-RA-01",
      periodStartDate: "2025-04-01",
      periodEndDate: "2025-04-30",
      mandaysCount: 450,
      grossAmount: 500000,
      deductionsAmount: 25000,
      notes: "Structural steel rebar tying and column fabrication",
    },
    adminCtx
  );

  assert.equal(bill.netPayable, 475000);
  assert.equal(bill.status, "SUBMITTED");

  // 3. Review and approve bill
  const approvedBill = await workforceService.reviewContractorBill(
    {
      billId: bill.id,
      decision: "APPROVED",
      notes: "Mandays and steel fabrication weight verified by QA/QC",
    },
    adminCtx
  );

  assert.equal(approvedBill.status, "APPROVED");

  // Check contractor ledger before payment
  let summary = await workforceService.getContractor(contractor.id, adminCtx);
  assert.equal(summary.totalBilledAmount, 475000);
  assert.equal(summary.totalPaidAmount, 0);
  assert.equal(summary.outstandingAmount, 475000);

  // 4. Disburse partial payment of ₹300,000 via NEFT
  const payment1 = await workforceService.recordContractorPayment(
    {
      billId: bill.id,
      amount: 300000,
      paymentDate: "2025-05-10",
      paymentMode: "BANK_TRANSFER",
      referenceNumber: "UTR98765432101",
      notes: "First installment bank transfer",
    },
    adminCtx
  );

  assert.equal(payment1.amount, 300000);

  // Verify updated outstanding balance
  summary = await workforceService.getContractor(contractor.id, adminCtx);
  assert.equal(summary.totalBilledAmount, 475000);
  assert.equal(summary.totalPaidAmount, 300000);
  assert.equal(summary.outstandingAmount, 175000, "Outstanding must be 475,000 - 300,000 = 175,000");

  // 5. Settle remaining ₹175,000
  await workforceService.recordContractorPayment(
    {
      billId: bill.id,
      amount: 175000,
      paymentDate: "2025-05-25",
      paymentMode: "BANK_TRANSFER",
      referenceNumber: "UTR98765432102",
      notes: "Final bill clearance",
    },
    adminCtx
  );

  summary = await workforceService.getContractor(contractor.id, adminCtx);
  assert.equal(summary.totalPaidAmount, 475000);
  assert.equal(summary.outstandingAmount, 0, "Bill fully paid -> Outstanding must be 0");
});

test("Workforce: Employee Self-Service Portal Profile, Salary, Leaves & Circulars", async () => {
  const engineerCtx = createMockContext(ENGINEER_USER_ID);

  // 1. Resolve self profile
  const myProfile = await workforceService.getMyProfile(engineerCtx);
  assert.equal(myProfile.firstName, "Vikram");
  assert.equal(myProfile.employeeCode, "EMP-APEX-002");
  assert.equal(myProfile.siteName, "Skyline Tower A & Basement Podium");

  // 2. View salary breakdown
  const mySalary = await workforceService.getMySalary(engineerCtx);
  assert.ok(mySalary.salaryStructure, "Salary record must be present");
  assert.equal(mySalary.salaryStructure.baseSalary, 45000);
  assert.equal(mySalary.salaryStructure.hra, 15000);
  assert.ok(mySalary.netTakeHome > 0, "Net pay must be calculated");

  // 3. View leave balances
  const myLeaves = await workforceService.getMyLeaves(engineerCtx);
  assert.ok(myLeaves.balances.length > 0, "User must have active leave balances");
  const casualLeave = myLeaves.balances[0];

  // 4. Apply for leave
  const leaveReq = await workforceService.applyLeave(
    {
      leaveTypeId: casualLeave.leaveTypeId,
      startDate: "2025-06-10",
      endDate: "2025-06-12",
      reason: "Family function in home town",
    },
    engineerCtx
  );

  assert.equal(leaveReq.status, "PENDING");
  assert.equal(leaveReq.daysCount, 3);
  assert.equal(leaveReq.employeeId, myProfile.id);

  // 5. Get company announcements
  const announcements = await workforceService.getAnnouncements(engineerCtx);
  assert.ok(announcements.length >= 2, "Must return seeded company circulars");
  const highPriority = announcements.find((a) => a.priority === "HIGH");
  assert.ok(highPriority, "High priority safety circular must be present");
});

test("Workforce: Executive Dashboard Aggregation Metrics", async () => {
  const adminCtx = createMockContext(ADMIN_USER_ID);

  const summary = await workforceService.getDashboardSummary(adminCtx);

  assert.ok(summary.totalEmployees >= 4, "Must aggregate all employees");
  assert.ok(summary.totalLabourers >= 5, "Must aggregate all labourers");
  assert.ok(summary.activeContractors >= 2, "Must count active contractors");
  assert.ok(Array.isArray(summary.siteWiseWorkforce), "Site workforce array must be returned");
  assert.ok(summary.siteWiseWorkforce.length > 0, "Must contain site distribution");
  assert.ok(summary.skillDistribution, "Must contain skill distribution");
  assert.ok(summary.tradeDistribution, "Must contain trade distribution");
});
