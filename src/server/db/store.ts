// ==============================================================================
// CONSTRUCT360 IN-MEMORY ATOMIC DATA STORE
// High-Fidelity Multi-Tenant Repository Storage with Transactional Support
// ==============================================================================

import { randomUUID } from "node:crypto";
import type {
  DbAttendanceApproval,
  DbAttendanceEvent,
  DbAttendanceSession,
  DbAuditLog,
  DbBranch,
  DbCompany,
  DbCompanyAnnouncement,
  DbContractor,
  DbContractorBill,
  DbContractorPayment,
  DbDepartment,
  DbDesignation,
  DbDocument,
  DbDocumentVersion,
  DbEmployee,
  DbEmployeeDocument,
  DbEmployeeHistory,
  DbLabourTransfer,
  DbLabourWageAdvance,
  DbLabourer,
  DbLeaveBalance,
  DbLeaveRequest,
  DbLeaveType,
  DbLocationEvent,
  DbNotification,
  DbPasswordResetToken,
  DbPermission,
  DbProject,
  DbProjectDelayRecord,
  DbProjectDocument,
  DbProjectExpense,
  DbProjectHistory,
  DbProjectTask,
  DbRole,
  DbRolePermission,
  DbSalaryStructure,
  DbShift,
  DbShiftRoster,
  DbSite,
  DbSiteAssignment,
  DbSiteGeofence,
  DbSiteGeofenceHistory,
  DbTaskDependency,
  DbUser,
  DbUserCompanyMembership,
  DbUserInvitation,
  DbUserRole,
  DbUserSession,
  DbWbsNode,
  DbConstructionProgressActivity,
  DbProgressMeasurementLog,
  DbMaterial,
  DbWarehouse,
  DbStorageLocation,
  DbWarehouseStock,
  DbStockLedgerEntry,
  DbMaterialRequest,
  DbMaterialRequestItem,
  DbStockTransfer,
  DbSupplierPriceHistory,
} from "./types";

export class DataStore {
  public companies: Map<string, DbCompany> = new Map();
  public branches: Map<string, DbBranch> = new Map();
  public users: Map<string, DbUser> = new Map();
  public memberships: Map<string, DbUserCompanyMembership> = new Map();
  public sessions: Map<string, DbUserSession> = new Map();
  public roles: Map<string, DbRole> = new Map();
  public permissions: Map<string, DbPermission> = new Map();
  public rolePermissions: Map<string, DbRolePermission> = new Map();
  public userRoles: Map<string, DbUserRole> = new Map();
  public auditLogs: DbAuditLog[] = [];
  public notifications: Map<string, DbNotification> = new Map();
  public documents: Map<string, DbDocument> = new Map();
  public documentVersions: Map<string, DbDocumentVersion> = new Map();
  public passwordResetTokens: Map<string, DbPasswordResetToken> = new Map();
  public invitations: Map<string, DbUserInvitation> = new Map();

  // Geospatial & Attendance Extensions
  public projects: Map<string, DbProject> = new Map();
  public sites: Map<string, DbSite> = new Map();
  public geofences: Map<string, DbSiteGeofence> = new Map();
  public geofenceHistories: DbSiteGeofenceHistory[] = [];
  public siteAssignments: Map<string, DbSiteAssignment> = new Map();
  public shifts: Map<string, DbShift> = new Map();
  public shiftRosters: Map<string, DbShiftRoster> = new Map();
  public employees: Map<string, DbEmployee> = new Map();
  public labourers: Map<string, DbLabourer> = new Map();
  public attendanceSessions: Map<string, DbAttendanceSession> = new Map();
  public attendanceEvents: Map<string, DbAttendanceEvent> = new Map();
  public locationEvents: Map<string, DbLocationEvent> = new Map();
  public attendanceApprovals: Map<string, DbAttendanceApproval> = new Map();

  // Workforce Management Extensions
  public departments: Map<string, DbDepartment> = new Map();
  public designations: Map<string, DbDesignation> = new Map();
  public employeeDocuments: Map<string, DbEmployeeDocument> = new Map();
  public employeeHistories: DbEmployeeHistory[] = [];
  public salaryStructures: Map<string, DbSalaryStructure> = new Map();
  public labourAdvances: Map<string, DbLabourWageAdvance> = new Map();
  public labourTransfers: Map<string, DbLabourTransfer> = new Map();
  public contractors: Map<string, DbContractor> = new Map();
  public contractorBills: Map<string, DbContractorBill> = new Map();
  public contractorPayments: Map<string, DbContractorPayment> = new Map();
  public leaveTypes: Map<string, DbLeaveType> = new Map();
  public leaveBalances: Map<string, DbLeaveBalance> = new Map();
  public leaveRequests: Map<string, DbLeaveRequest> = new Map();
  public announcements: Map<string, DbCompanyAnnouncement> = new Map();

  // Project Management & Planning
  public projectDocuments: Map<string, DbProjectDocument> = new Map();
  public projectHistories: DbProjectHistory[] = [];
  public wbsNodes: Map<string, DbWbsNode> = new Map();
  public projectTasks: Map<string, DbProjectTask> = new Map();
  public taskDependencies: Map<string, DbTaskDependency> = new Map();
  public progressActivities: Map<string, DbConstructionProgressActivity> = new Map();
  public measurementLogs: Map<string, DbProgressMeasurementLog> = new Map();
  public delayRecords: Map<string, DbProjectDelayRecord> = new Map();
  public projectExpenses: Map<string, DbProjectExpense> = new Map();

  // Inventory & Warehouse Management
  public materials: Map<string, DbMaterial> = new Map();
  public warehouses: Map<string, DbWarehouse> = new Map();
  public storageLocations: Map<string, DbStorageLocation> = new Map();
  public warehouseStocks: Map<string, DbWarehouseStock> = new Map();
  public stockLedger: Map<string, DbStockLedgerEntry> = new Map();
  public materialRequests: Map<string, DbMaterialRequest> = new Map();
  public stockTransfers: Map<string, DbStockTransfer> = new Map();
  public supplierPriceHistories: Map<string, DbSupplierPriceHistory> = new Map();

  constructor() {
    this.seed();
  }

  public reset(): void {
    this.companies.clear();
    this.branches.clear();
    this.users.clear();
    this.memberships.clear();
    this.sessions.clear();
    this.roles.clear();
    this.permissions.clear();
    this.rolePermissions.clear();
    this.userRoles.clear();
    this.auditLogs = [];
    this.notifications.clear();
    this.documents.clear();
    this.documentVersions.clear();
    this.passwordResetTokens.clear();
    this.invitations.clear();

    this.projects.clear();
    this.sites.clear();
    this.geofences.clear();
    this.geofenceHistories = [];
    this.siteAssignments.clear();
    this.shifts.clear();
    this.shiftRosters.clear();
    this.employees.clear();
    this.labourers.clear();
    this.attendanceSessions.clear();
    this.attendanceEvents.clear();
    this.locationEvents.clear();
    this.attendanceApprovals.clear();

    this.departments.clear();
    this.designations.clear();
    this.employeeDocuments.clear();
    this.employeeHistories = [];
    this.salaryStructures.clear();
    this.labourAdvances.clear();
    this.labourTransfers.clear();
    this.contractors.clear();
    this.contractorBills.clear();
    this.contractorPayments.clear();
    this.leaveTypes.clear();
    this.leaveBalances.clear();
    this.leaveRequests.clear();
    this.announcements.clear();

    this.projectDocuments.clear();
    this.projectHistories = [];
    this.wbsNodes.clear();
    this.projectTasks.clear();
    this.taskDependencies.clear();
    this.progressActivities.clear();
    this.measurementLogs.clear();
    this.delayRecords.clear();
    this.projectExpenses.clear();

    this.materials.clear();
    this.warehouses.clear();
    this.storageLocations.clear();
    this.warehouseStocks.clear();
    this.stockLedger.clear();
    this.materialRequests.clear();
    this.stockTransfers.clear();
    this.supplierPriceHistories.clear();

    this.seed();
  }

  private seed(): void {
    const now = new Date();

    // 1. Companies
    const apexCompany: DbCompany = {
      id: "c0000001-0000-0000-0000-000000000001",
      code: "APEX-INFR",
      legalName: "Apex Infrastructure Projects Ltd",
      tradeName: "Apex Infra",
      taxId: "29AAACA1234A1Z5",
      registrationNumber: "CIN-U45200KA2015PLC012345",
      currency: "INR",
      email: "admin@apexinfra.com",
      phone: "+918041234567",
      website: "https://apexinfra.com",
      timezone: "Asia/Kolkata",
      settings: { retentionRatePercent: 5.0 },
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const metroCompany: DbCompany = {
      id: "c0000002-0000-0000-0000-000000000002",
      code: "METRO-BLD",
      legalName: "Metro Builtcon Private Limited",
      tradeName: "Metro Builtcon",
      taxId: "27AAACM9876M1Z2",
      registrationNumber: "CIN-U45201MH2018PTC987654",
      currency: "INR",
      email: "contact@metrobuiltcon.com",
      phone: "+912224567890",
      website: "https://metrobuiltcon.com",
      timezone: "Asia/Kolkata",
      settings: {},
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.companies.set(apexCompany.id, apexCompany);
    this.companies.set(metroCompany.id, metroCompany);

    // 2. Branches
    const blrBranch: DbBranch = {
      id: "b0000001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      code: "BLR-HQ",
      name: "Bangalore Corporate HQ",
      email: "blr@apexinfra.com",
      phone: "+918041234500",
      addressLine1: "Prestige Tech Cloud, Hebbal",
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
      postalCode: "560024",
      isHeadquarters: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const mumBranch: DbBranch = {
      id: "b0000002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      code: "MUM-REG",
      name: "Mumbai Regional Office",
      email: "mum@apexinfra.com",
      phone: "+912241234500",
      addressLine1: "BKC Commercial Hub, Bandra East",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      postalCode: "400051",
      isHeadquarters: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.branches.set(blrBranch.id, blrBranch);
    this.branches.set(mumBranch.id, mumBranch);

    // 3. Permissions Catalog across the 7 Action Pillars:
    // View, Create, Update, Delete, Approve, Export, Manage
    const resources = [
      "companies", "branches", "users", "roles", "permissions",
      "projects", "sites", "attendance", "inventory", "finance",
      "documents", "audit_logs", "employees", "labourers", "contractors", "leaves", "payroll",
      "tasks", "progress"
    ];

    const actions = ["View", "Create", "Update", "Delete", "Approve", "Export", "Manage"] as const;

    for (const res of resources) {
      for (const act of actions) {
        const code = `${res}:${act.toLowerCase()}`;
        const p: DbPermission = {
          id: randomUUID(),
          category: res.toUpperCase(),
          action: act,
          resource: res,
          code,
          description: `Permission to ${act} ${res}`,
          createdAt: now,
        };
        this.permissions.set(p.id, p);
      }
    }

    // 4. Standard Roles
    const superAdminRole: DbRole = {
      id: "r0000000-0000-0000-0000-000000000001",
      companyId: null, // System-wide
      name: "Super Administrator",
      slug: "super_admin",
      description: "Platform root superadmin with unrestricted capabilities",
      isSystemRole: true,
      createdAt: now,
      updatedAt: now,
    };

    const companyAdminRole: DbRole = {
      id: "r0000001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      name: "Company Administrator",
      slug: "company_admin",
      description: "Full management authority within company boundary",
      isSystemRole: true,
      createdAt: now,
      updatedAt: now,
    };

    const projectManagerRole: DbRole = {
      id: "r0000002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      name: "Project Manager",
      slug: "project_manager",
      description: "Manages projects, site progress, schedules, and approvals",
      isSystemRole: false,
      createdAt: now,
      updatedAt: now,
    };

    const siteEngineerRole: DbRole = {
      id: "r0000003-0000-0000-0000-000000000003",
      companyId: apexCompany.id,
      name: "Site Engineer",
      slug: "site_engineer",
      description: "Records daily site operations, DPR, and attendance",
      isSystemRole: false,
      createdAt: now,
      updatedAt: now,
    };

    this.roles.set(superAdminRole.id, superAdminRole);
    this.roles.set(companyAdminRole.id, companyAdminRole);
    this.roles.set(projectManagerRole.id, projectManagerRole);
    this.roles.set(siteEngineerRole.id, siteEngineerRole);

    // Assign all permissions to Company Admin & Super Admin
    for (const perm of this.permissions.values()) {
      this.rolePermissions.set(`${superAdminRole.id}_${perm.id}`, {
        roleId: superAdminRole.id,
        permissionId: perm.id,
        createdAt: now,
      });
      this.rolePermissions.set(`${companyAdminRole.id}_${perm.id}`, {
        roleId: companyAdminRole.id,
        permissionId: perm.id,
        createdAt: now,
      });

      // Project manager gets View, Create, Update, Approve, Export on projects, attendance, documents, workforce, tasks, progress, inventory
      if (["projects", "sites", "attendance", "documents", "employees", "labourers", "contractors", "leaves", "payroll", "tasks", "progress", "inventory"].includes(perm.resource)) {
        this.rolePermissions.set(`${projectManagerRole.id}_${perm.id}`, {
          roleId: projectManagerRole.id,
          permissionId: perm.id,
          createdAt: now,
        });
      }
    }

    // 5. Users
    // Password: "Construct360#Secure2026"
    const superAdminUser: DbUser = {
      id: "u0000001-0000-0000-0000-000000000001",
      email: "superadmin@construct360.internal",
      phoneNumber: "+919876543210",
      passwordHash: "$2a$12$K1dJgAHzu1fM.PqD63OQ8OQc3s6oVn.hMbmV.G7xT7lq2yWn2j2Kq",
      fullName: "Super Admin",
      isActive: true,
      isEmailVerified: true,
      mfaEnabled: false,
      createdAt: now,
      updatedAt: now,
    };

    const apexAdminUser: DbUser = {
      id: "u0000002-0000-0000-0000-000000000002",
      email: "rajesh.menon@apexinfra.com",
      phoneNumber: "+919876500001",
      passwordHash: "$2a$12$K1dJgAHzu1fM.PqD63OQ8OQc3s6oVn.hMbmV.G7xT7lq2yWn2j2Kq",
      fullName: "Rajesh Menon (VP Operations)",
      isActive: true,
      isEmailVerified: true,
      mfaEnabled: true,
      mfaSecret: "JBSWY3DPEHPK3PXP", // Base32 test secret
      createdAt: now,
      updatedAt: now,
    };

    const pmUser: DbUser = {
      id: "u0000003-0000-0000-0000-000000000003",
      email: "suresh.kumar@apexinfra.com",
      phoneNumber: "+919876500002",
      passwordHash: "$2a$12$K1dJgAHzu1fM.PqD63OQ8OQc3s6oVn.hMbmV.G7xT7lq2yWn2j2Kq",
      fullName: "Suresh Kumar (Project Manager)",
      isActive: true,
      isEmailVerified: true,
      mfaEnabled: false,
      createdAt: now,
      updatedAt: now,
    };

    const engineerUser: DbUser = {
      id: "u0000004-0000-0000-0000-000000000004",
      email: "vikram.singh@apexinfra.com",
      phoneNumber: "+919876500003",
      passwordHash: "$2a$12$K1dJgAHzu1fM.PqD63OQ8OQc3s6oVn.hMbmV.G7xT7lq2yWn2j2Kq",
      fullName: "Vikram Singh (Site Engineer)",
      isActive: true,
      isEmailVerified: true,
      mfaEnabled: false,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(superAdminUser.id, superAdminUser);
    this.users.set(apexAdminUser.id, apexAdminUser);
    this.users.set(pmUser.id, pmUser);
    this.users.set(engineerUser.id, engineerUser);

    // 6. User Company Memberships
    this.memberships.set("m1", {
      id: "m1",
      userId: superAdminUser.id,
      companyId: apexCompany.id,
      defaultBranchId: blrBranch.id,
      isDefault: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    this.memberships.set("m2", {
      id: "m2",
      userId: superAdminUser.id,
      companyId: metroCompany.id,
      isDefault: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    this.memberships.set("m3", {
      id: "m3",
      userId: apexAdminUser.id,
      companyId: apexCompany.id,
      defaultBranchId: blrBranch.id,
      isDefault: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    this.memberships.set("m4", {
      id: "m4",
      userId: pmUser.id,
      companyId: apexCompany.id,
      defaultBranchId: blrBranch.id,
      isDefault: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    this.memberships.set("m5", {
      id: "m5",
      userId: engineerUser.id,
      companyId: apexCompany.id,
      defaultBranchId: blrBranch.id,
      isDefault: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // 7. User Roles
    this.userRoles.set("ur1", {
      id: "ur1",
      companyId: apexCompany.id,
      userId: superAdminUser.id,
      roleId: superAdminRole.id,
      createdAt: now,
    });
    this.userRoles.set("ur2", {
      id: "ur2",
      companyId: apexCompany.id,
      userId: apexAdminUser.id,
      roleId: companyAdminRole.id,
      createdAt: now,
    });
    this.userRoles.set("ur3", {
      id: "ur3",
      companyId: apexCompany.id,
      userId: pmUser.id,
      roleId: projectManagerRole.id,
      projectId: "a0000001-0000-0000-0000-000000000001", // Skyline Tech Park
      createdAt: now,
    });
    this.userRoles.set("ur4", {
      id: "ur4",
      companyId: apexCompany.id,
      userId: engineerUser.id,
      roleId: siteEngineerRole.id,
      projectId: "a0000001-0000-0000-0000-000000000001",
      createdAt: now,
    });

    // Grant Site Engineer attendance, sites, tasks, progress & inventory permissions
    for (const perm of this.permissions.values()) {
      if (["attendance", "sites", "tasks", "progress", "inventory"].includes(perm.resource) && ["view", "create", "update", "approve"].includes(perm.action.toLowerCase())) {
        this.rolePermissions.set(`${siteEngineerRole.id}_${perm.id}`, {
          roleId: siteEngineerRole.id,
          permissionId: perm.id,
          createdAt: now,
        });
      }
    }

    // 8. Departments & Designations
    const deptCivil: DbDepartment = {
      id: "dept0001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      code: "CIVIL-ENG",
      name: "Civil Engineering & Site Execution",
      createdAt: now,
      updatedAt: now,
    };

    const deptSafety: DbDepartment = {
      id: "dept0002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      code: "QA-QC-HSE",
      name: "Quality Assurance & Health, Safety, Environment",
      createdAt: now,
      updatedAt: now,
    };

    this.departments.set(deptCivil.id, deptCivil);
    this.departments.set(deptSafety.id, deptSafety);

    const desigDirector: DbDesignation = {
      id: "desig001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      title: "Project Director",
      level: 1,
      createdAt: now,
      updatedAt: now,
    };

    const desigPM: DbDesignation = {
      id: "desig002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      title: "Senior Project Manager",
      level: 2,
      createdAt: now,
      updatedAt: now,
    };

    const desigSiteEng: DbDesignation = {
      id: "desig003-0000-0000-0000-000000000003",
      companyId: apexCompany.id,
      title: "Site In-Charge Engineer",
      level: 3,
      createdAt: now,
      updatedAt: now,
    };

    const desigSafetyOfficer: DbDesignation = {
      id: "desig004-0000-0000-0000-000000000004",
      companyId: apexCompany.id,
      title: "Safety & Quality Officer",
      level: 4,
      createdAt: now,
      updatedAt: now,
    };

    this.designations.set(desigDirector.id, desigDirector);
    this.designations.set(desigPM.id, desigPM);
    this.designations.set(desigSiteEng.id, desigSiteEng);
    this.designations.set(desigSafetyOfficer.id, desigSafetyOfficer);

    // 9. Employees
    const empRajesh: DbEmployee = {
      id: "e0000001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      branchId: blrBranch.id,
      userId: apexAdminUser.id,
      departmentId: deptCivil.id,
      designationId: desigDirector.id,
      reportingManagerId: null,
      assignedProjectId: "a0000001-0000-0000-0000-000000000001",
      employeeCode: "EMP-APEX-001",
      firstName: "Rajesh",
      lastName: "Menon",
      email: apexAdminUser.email,
      phone: "+919876500001",
      employmentType: "PERMANENT",
      status: "ACTIVE",
      joiningDate: new Date("2020-03-01"),
      dateOfBirth: new Date("1980-05-14"),
      gender: "MALE",
      maritalStatus: "MARRIED",
      bloodGroup: "O+",
      nationality: "Indian",
      address: "124 Palm Meadows, Whitefield, Bengaluru",
      emergencyContactName: "Priya Menon",
      emergencyContactPhone: "+919876500099",
      emergencyContactRelation: "Spouse",
      panNumber: "ABCDE1234F",
      aadhaarNumber: "9876-5432-1012",
      bankAccountNumber: "001122334455",
      bankIfsc: "HDFC0001234",
      bankName: "HDFC Bank",
      createdAt: now,
      updatedAt: now,
    };

    const empVikram: DbEmployee = {
      id: "e0000002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      branchId: blrBranch.id,
      userId: engineerUser.id,
      departmentId: deptCivil.id,
      designationId: desigSiteEng.id,
      reportingManagerId: "e0000003-0000-0000-0000-000000000003", // Suresh Kumar
      assignedProjectId: "a0000001-0000-0000-0000-000000000001",
      assignedSiteId: "s0000001-0000-0000-0000-000000000001",
      employeeCode: "EMP-APEX-002",
      firstName: "Vikram",
      lastName: "Singh",
      email: engineerUser.email,
      phone: "+919876500003",
      employmentType: "PERMANENT",
      status: "ACTIVE",
      joiningDate: new Date("2024-01-15"),
      dateOfBirth: new Date("1994-08-22"),
      gender: "MALE",
      maritalStatus: "SINGLE",
      bloodGroup: "B+",
      nationality: "Indian",
      address: "Flat 402, Green Glen Layout, Bellandur, Bengaluru",
      emergencyContactName: "Harbhajan Singh",
      emergencyContactPhone: "+919876500088",
      emergencyContactRelation: "Father",
      panNumber: "BCDEF5678G",
      aadhaarNumber: "8765-4321-2109",
      bankAccountNumber: "998877665544",
      bankIfsc: "ICIC0005678",
      bankName: "ICICI Bank",
      createdAt: now,
      updatedAt: now,
    };

    const empSuresh: DbEmployee = {
      id: "e0000003-0000-0000-0000-000000000003",
      companyId: apexCompany.id,
      branchId: blrBranch.id,
      userId: pmUser.id,
      departmentId: deptCivil.id,
      designationId: desigPM.id,
      reportingManagerId: empRajesh.id,
      assignedProjectId: "a0000001-0000-0000-0000-000000000001",
      employeeCode: "EMP-APEX-003",
      firstName: "Suresh",
      lastName: "Kumar",
      email: pmUser.email,
      phone: "+919876500002",
      employmentType: "PERMANENT",
      status: "ACTIVE",
      joiningDate: new Date("2022-06-10"),
      dateOfBirth: new Date("1986-11-30"),
      gender: "MALE",
      maritalStatus: "MARRIED",
      bloodGroup: "A+",
      nationality: "Indian",
      address: "88 Silver County, Haralur Road, Bengaluru",
      emergencyContactName: "Meenakshi Kumar",
      emergencyContactPhone: "+919876500077",
      emergencyContactRelation: "Spouse",
      panNumber: "CDEFG9012H",
      aadhaarNumber: "7654-3210-3210",
      bankAccountNumber: "554433221100",
      bankIfsc: "SBIN0009012",
      bankName: "State Bank of India",
      createdAt: now,
      updatedAt: now,
    };

    const empAnanya: DbEmployee = {
      id: "e0000004-0000-0000-0000-000000000004",
      companyId: apexCompany.id,
      branchId: blrBranch.id,
      departmentId: deptSafety.id,
      designationId: desigSafetyOfficer.id,
      reportingManagerId: empSuresh.id,
      assignedProjectId: "a0000001-0000-0000-0000-000000000001",
      assignedSiteId: "s0000001-0000-0000-0000-000000000001",
      employeeCode: "EMP-APEX-004",
      firstName: "Ananya",
      lastName: "Sharma",
      email: "ananya.sharma@apexinfra.com",
      phone: "+919876500004",
      employmentType: "CONTRACTUAL",
      status: "ACTIVE",
      joiningDate: new Date("2025-02-01"),
      dateOfBirth: new Date("1996-04-18"),
      gender: "FEMALE",
      maritalStatus: "SINGLE",
      bloodGroup: "O-",
      nationality: "Indian",
      address: "Tower 2 Flat 1004, Sobha Dream Acres, Panathur, Bengaluru",
      emergencyContactName: "Rakesh Sharma",
      emergencyContactPhone: "+919876500066",
      emergencyContactRelation: "Father",
      panNumber: "DEFGH3456I",
      aadhaarNumber: "6543-2109-4321",
      bankAccountNumber: "667788990011",
      bankIfsc: "KKBK0003456",
      bankName: "Kotak Mahindra Bank",
      createdAt: now,
      updatedAt: now,
    };

    this.employees.set(empRajesh.id, empRajesh);
    this.employees.set(empVikram.id, empVikram);
    this.employees.set(empSuresh.id, empSuresh);
    this.employees.set(empAnanya.id, empAnanya);

    // 10. Salary Structures
    this.salaryStructures.set(empVikram.id, {
      id: "sal0001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      employeeId: empVikram.id,
      baseSalary: 45000,
      hra: 15000,
      conveyanceAllowance: 3000,
      siteAllowance: 5000,
      specialAllowance: 2000,
      pfEmployeePercent: 12.0,
      esiEmployeePercent: 0.75,
      professionalTax: 200,
      effectiveFrom: new Date("2024-01-15"),
      createdAt: now,
      updatedAt: now,
    });

    this.salaryStructures.set(empSuresh.id, {
      id: "sal0002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      employeeId: empSuresh.id,
      baseSalary: 75000,
      hra: 25000,
      conveyanceAllowance: 5000,
      siteAllowance: 8000,
      specialAllowance: 5000,
      pfEmployeePercent: 12.0,
      esiEmployeePercent: 0.0,
      professionalTax: 200,
      effectiveFrom: new Date("2022-06-10"),
      createdAt: now,
      updatedAt: now,
    });

    // 11. Employee Documents
    this.employeeDocuments.set("doc001", {
      id: "doc001",
      companyId: apexCompany.id,
      employeeId: empVikram.id,
      documentType: "ID_PROOF",
      title: "Government Aadhaar Card Identification",
      fileName: "aadhaar_vikram_singh.pdf",
      fileUrl: "/docs/aadhaar_vikram.pdf",
      verificationStatus: "VERIFIED",
      verifiedByUserId: apexAdminUser.id,
      verifiedAt: now,
      createdAt: now,
    });

    this.employeeDocuments.set("doc002", {
      id: "doc002",
      companyId: apexCompany.id,
      employeeId: empVikram.id,
      documentType: "EMPLOYMENT_CONTRACT",
      title: "Signed Permanent Employment Appointment Letter",
      fileName: "appointment_letter_vikram.pdf",
      fileUrl: "/docs/appointment_letter_vikram.pdf",
      verificationStatus: "VERIFIED",
      verifiedByUserId: apexAdminUser.id,
      verifiedAt: now,
      createdAt: now,
    });

    this.employeeDocuments.set("doc003", {
      id: "doc003",
      companyId: apexCompany.id,
      employeeId: empAnanya.id,
      documentType: "CERTIFICATION",
      title: "OSHA-30 Construction Site Safety Certificate",
      fileName: "osha30_ananya_sharma.pdf",
      fileUrl: "/docs/osha30_ananya.pdf",
      verificationStatus: "PENDING",
      createdAt: now,
    });

    // 12. Employee History
    this.employeeHistories.push({
      id: "eh001",
      companyId: apexCompany.id,
      employeeId: empVikram.id,
      eventType: "JOINED",
      description: "Onboarded as Site In-Charge Engineer for Skyline Tower A",
      changedByUserId: apexAdminUser.id,
      effectiveDate: new Date("2024-01-15"),
      createdAt: now,
    });

    // 13. Labour Contractors
    const contBalaji: DbContractor = {
      id: "c0000001-cont-0000-000000000001",
      companyId: apexCompany.id,
      contractorCode: "CONT-BALAJI-01",
      businessName: "Shree Balaji Labour Supply & Civil Works",
      contractorType: "LABOUR_SUPPLY",
      contactPerson: "Mohan Lal Sharma",
      phone: "+919845012345",
      email: "shreebalaji.labour@gmail.com",
      taxId: "29AAACS1234F1Z1",
      panNumber: "AAACS1234F",
      address: "Plot 45, Peenya Industrial Area 2nd Stage, Bengaluru",
      rating: 4.8,
      contractValidFrom: new Date("2025-01-01"),
      contractValidTo: new Date("2027-12-31"),
      contractRates: {
        MASON: 850,
        BAR_BENDER: 820,
        CARPENTER: 800,
        GENERAL_HELPER: 550,
      },
      agreementDocUrl: "/contracts/shree_balaji_agreement_2025.pdf",
      allocatedProjectIds: ["a0000001-0000-0000-0000-000000000001"],
      allocatedSiteIds: ["s0000001-0000-0000-0000-000000000001"],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const contSupreme: DbContractor = {
      id: "c0000002-cont-0000-000000000002",
      companyId: apexCompany.id,
      contractorCode: "CONT-SUPREME-02",
      businessName: "Supreme Electricals & MEP Subcontractors",
      contractorType: "ELECTRICAL",
      contactPerson: "Dinesh Verma",
      phone: "+919845098765",
      email: "contact@supremeelectricals.in",
      taxId: "29AAACS5678F1Z9",
      panNumber: "AAACS5678F",
      address: "12 Bommasandra Link Road, Electronic City, Bengaluru",
      rating: 4.6,
      contractValidFrom: new Date("2025-03-01"),
      contractValidTo: new Date("2026-12-31"),
      contractRates: {
        ELECTRICIAN: 850,
        PLUMBER: 830,
        GENERAL_HELPER: 550,
      },
      agreementDocUrl: "/contracts/supreme_electricals_agreement.pdf",
      allocatedProjectIds: ["a0000001-0000-0000-0000-000000000001"],
      allocatedSiteIds: ["s0000002-0000-0000-0000-000000000002"],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.contractors.set(contBalaji.id, contBalaji);
    this.contractors.set(contSupreme.id, contSupreme);

    // 14. Labourers
    const labRamesh: DbLabourer = {
      id: "l0000001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      contractorId: contBalaji.id,
      labourerCode: "LAB-001",
      firstName: "Ramesh",
      lastName: "Chand",
      phone: "+919811122233",
      skillLevel: "SKILLED",
      primaryTrade: "MASON",
      dailyWageRate: 850.0,
      hourlyWageRate: 110.0,
      pieceRateWage: 45.0,
      groupName: "Squad A - Structural Masonry",
      availabilityStatus: "AVAILABLE",
      currentProjectId: "a0000001-0000-0000-0000-000000000001",
      currentSiteId: "s0000001-0000-0000-0000-000000000001",
      emergencyPhone: "+919811122299",
      idProofType: "AADHAAR",
      idProofNumber: "3344-5566-7788",
      biometricEnrolled: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const labAnsari: DbLabourer = {
      id: "l0000002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      contractorId: contBalaji.id,
      labourerCode: "LAB-002",
      firstName: "Mohammed",
      lastName: "Ansari",
      phone: "+919822233344",
      skillLevel: "SKILLED",
      primaryTrade: "BAR_BENDER",
      dailyWageRate: 820.0,
      hourlyWageRate: 105.0,
      pieceRateWage: 50.0,
      groupName: "Squad B - Rebar Tying",
      availabilityStatus: "AVAILABLE",
      currentProjectId: "a0000001-0000-0000-0000-000000000001",
      currentSiteId: "s0000001-0000-0000-0000-000000000001",
      emergencyPhone: "+919822233388",
      idProofType: "AADHAAR",
      idProofNumber: "4455-6677-8899",
      biometricEnrolled: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const labPappu: DbLabourer = {
      id: "l0000003-0000-0000-0000-000000000003",
      companyId: apexCompany.id,
      contractorId: contBalaji.id,
      labourerCode: "LAB-003",
      firstName: "Pappu",
      lastName: "Yadav",
      phone: "+919833344455",
      skillLevel: "UNSKILLED",
      primaryTrade: "GENERAL_HELPER",
      dailyWageRate: 550.0,
      hourlyWageRate: 70.0,
      pieceRateWage: 0.0,
      groupName: "Squad C - General Material Handling",
      availabilityStatus: "AVAILABLE",
      currentProjectId: "a0000001-0000-0000-0000-000000000001",
      currentSiteId: "s0000001-0000-0000-0000-000000000001",
      biometricEnrolled: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const labGurpreet: DbLabourer = {
      id: "l0000004-0000-0000-0000-000000000004",
      companyId: apexCompany.id,
      contractorId: contBalaji.id,
      labourerCode: "LAB-004",
      firstName: "Gurpreet",
      lastName: "Singh",
      phone: "+919844455566",
      skillLevel: "SKILLED",
      primaryTrade: "CARPENTER",
      dailyWageRate: 800.0,
      hourlyWageRate: 100.0,
      pieceRateWage: 40.0,
      groupName: "Squad D - Formwork Shuttering",
      availabilityStatus: "AVAILABLE",
      currentProjectId: "a0000001-0000-0000-0000-000000000001",
      currentSiteId: "s0000001-0000-0000-0000-000000000001",
      biometricEnrolled: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const labSunil: DbLabourer = {
      id: "l0000005-0000-0000-0000-000000000005",
      companyId: apexCompany.id,
      contractorId: contSupreme.id,
      labourerCode: "LAB-005",
      firstName: "Sunil",
      lastName: "Kumar",
      phone: "+919855566677",
      skillLevel: "SKILLED",
      primaryTrade: "ELECTRICIAN",
      dailyWageRate: 850.0,
      hourlyWageRate: 110.0,
      pieceRateWage: 0.0,
      groupName: "MEP Electrical Unit 1",
      availabilityStatus: "AVAILABLE",
      currentProjectId: "a0000001-0000-0000-0000-000000000001",
      currentSiteId: "s0000002-0000-0000-0000-000000000002",
      biometricEnrolled: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.labourers.set(labRamesh.id, labRamesh);
    this.labourers.set(labAnsari.id, labAnsari);
    this.labourers.set(labPappu.id, labPappu);
    this.labourers.set(labGurpreet.id, labGurpreet);
    this.labourers.set(labSunil.id, labSunil);

    // 15. Labour Advances
    this.labourAdvances.set("adv001", {
      id: "adv001",
      companyId: apexCompany.id,
      labourerId: labRamesh.id,
      amount: 3000,
      requestDate: new Date("2026-11-01"),
      reason: "Emergency hospital expense for family",
      status: "APPROVED",
      approvedByUserId: apexAdminUser.id,
      approvedAt: new Date("2026-11-02"),
      createdAt: now,
    });

    this.labourAdvances.set("adv002", {
      id: "adv002",
      companyId: apexCompany.id,
      labourerId: labPappu.id,
      amount: 1500,
      requestDate: new Date("2026-11-05"),
      reason: "Travel fare to native hometown",
      status: "PENDING",
      createdAt: now,
    });

    // 16. Contractor Bills & Payments
    const bill1: DbContractorBill = {
      id: "bill001",
      companyId: apexCompany.id,
      contractorId: contBalaji.id,
      billNumber: "BILL-2026-10-BALAJI",
      projectId: "a0000001-0000-0000-0000-000000000001",
      siteId: "s0000001-0000-0000-0000-000000000001",
      periodStartDate: new Date("2026-10-01"),
      periodEndDate: new Date("2026-10-31"),
      mandaysCount: 320,
      grossAmount: 245000,
      deductionsAmount: 12000, // TDS & advance deductions
      netPayable: 233000,
      paidAmount: 233000,
      status: "PAID",
      submittedDate: new Date("2026-11-01"),
      approvedByUserId: apexAdminUser.id,
      approvedAt: new Date("2026-11-03"),
      notes: "Fully verified with biometric punch logs. TDS 2% deducted.",
      createdAt: now,
      updatedAt: now,
    };

    const bill2: DbContractorBill = {
      id: "bill002",
      companyId: apexCompany.id,
      contractorId: contBalaji.id,
      billNumber: "BILL-2026-11-BALAJI",
      projectId: "a0000001-0000-0000-0000-000000000001",
      siteId: "s0000001-0000-0000-0000-000000000001",
      periodStartDate: new Date("2026-11-01"),
      periodEndDate: new Date("2026-11-15"),
      mandaysCount: 280,
      grossAmount: 215000,
      deductionsAmount: 10000,
      netPayable: 205000,
      paidAmount: 100000,
      status: "PARTIALLY_PAID",
      submittedDate: new Date("2026-11-16"),
      approvedByUserId: apexAdminUser.id,
      approvedAt: new Date("2026-11-18"),
      notes: "First installment ₹100,000 disbursed via NEFT. Outstanding: ₹105,000.",
      createdAt: now,
      updatedAt: now,
    };

    this.contractorBills.set(bill1.id, bill1);
    this.contractorBills.set(bill2.id, bill2);

    this.contractorPayments.set("pay001", {
      id: "pay001",
      companyId: apexCompany.id,
      contractorId: contBalaji.id,
      billId: bill1.id,
      amount: 233000,
      paymentDate: new Date("2026-11-04"),
      paymentMode: "BANK_TRANSFER",
      referenceNumber: "UTR-HDFC-9918237462",
      notes: "Full settlement for October billing cycle",
      createdAt: now,
    });

    this.contractorPayments.set("pay002", {
      id: "pay002",
      companyId: apexCompany.id,
      contractorId: contBalaji.id,
      billId: bill2.id,
      amount: 100000,
      paymentDate: new Date("2026-11-19"),
      paymentMode: "BANK_TRANSFER",
      referenceNumber: "UTR-HDFC-8827364519",
      notes: "Part payment 1 of 2",
      createdAt: now,
    });

    // 17. Leaves
    const leaveCL: DbLeaveType = {
      id: "lt001",
      companyId: apexCompany.id,
      code: "CL",
      name: "Casual Leave",
      annualDaysAllowed: 12,
      isCarryForward: false,
      createdAt: now,
    };

    const leaveSL: DbLeaveType = {
      id: "lt002",
      companyId: apexCompany.id,
      code: "SL",
      name: "Sick Leave",
      annualDaysAllowed: 8,
      isCarryForward: false,
      createdAt: now,
    };

    const leaveEL: DbLeaveType = {
      id: "lt003",
      companyId: apexCompany.id,
      code: "EL",
      name: "Earned Leave",
      annualDaysAllowed: 15,
      isCarryForward: true,
      createdAt: now,
    };

    this.leaveTypes.set(leaveCL.id, leaveCL);
    this.leaveTypes.set(leaveSL.id, leaveSL);
    this.leaveTypes.set(leaveEL.id, leaveEL);

    this.leaveBalances.set(`${empVikram.id}_${leaveCL.id}`, {
      id: "lb001",
      companyId: apexCompany.id,
      employeeId: empVikram.id,
      leaveTypeId: leaveCL.id,
      year: 2026,
      allocatedDays: 12,
      usedDays: 2,
      pendingDays: 0,
    });

    this.leaveBalances.set(`${empVikram.id}_${leaveSL.id}`, {
      id: "lb002",
      companyId: apexCompany.id,
      employeeId: empVikram.id,
      leaveTypeId: leaveSL.id,
      year: 2026,
      allocatedDays: 8,
      usedDays: 1,
      pendingDays: 0,
    });

    this.leaveBalances.set(`${empVikram.id}_${leaveEL.id}`, {
      id: "lb003",
      companyId: apexCompany.id,
      employeeId: empVikram.id,
      leaveTypeId: leaveEL.id,
      year: 2026,
      allocatedDays: 15,
      usedDays: 0,
      pendingDays: 0,
    });

    this.leaveRequests.set("lr001", {
      id: "lr001",
      companyId: apexCompany.id,
      employeeId: empVikram.id,
      leaveTypeId: leaveCL.id,
      startDate: new Date("2026-10-12"),
      endDate: new Date("2026-10-13"),
      daysCount: 2,
      reason: "Family function in Chandigarh",
      status: "APPROVED",
      approvedByUserId: pmUser.id,
      approvedAt: new Date("2026-10-10"),
      createdAt: now,
      updatedAt: now,
    });

    // 18. Announcements
    this.announcements.set("ann001", {
      id: "ann001",
      companyId: apexCompany.id,
      title: "Mandatory Monsoon Safety & Scaffold Inspection Protocol",
      content:
        "All site engineers and safety officers must complete the daily double-coupler scaffolding check and ensure high-voltage dewatering pumps are inspected every morning before work permits are signed.",
      priority: "HIGH",
      category: "SAFETY",
      publishedAt: new Date("2026-11-01"),
      authorName: "Rajesh Menon (VP Operations)",
    });

    this.announcements.set("ann002", {
      id: "ann002",
      companyId: apexCompany.id,
      title: "Biometric & PostGIS Punch Synchronization Update",
      content:
        "Field punch records for permanent staff and daily wage labour gangs are now synchronized in real-time with contractor billing accounts. Ensure all gang transfers are logged via the portal.",
      priority: "NORMAL",
      category: "OPERATIONS",
      publishedAt: new Date("2026-11-05"),
      authorName: "Corporate HR & ERP Team",
    });

    // 10. Project
    const projectSkyline: DbProject = {
      id: "a0000001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      branchId: blrBranch.id,
      projectCode: "PRJ-SKY-001",
      name: "Skyline Tech Park Phase 2",
      description: "Grade-A Commercial IT Park Campus with 3 High-Rise Towers & Amenity Center",
      clientName: "Skyline Developers Realty Pvt Ltd",
      clientContactPerson: "Naveen Goel (Director Projects)",
      clientPhone: "+91 98450 11223",
      clientEmail: "naveen.goel@skylinedev.com",
      projectManagerId: empSuresh.id,
      contractValue: 450000000,
      budget: 380000000,
      status: "ACTIVE",
      healthStatus: "ON_TRACK",
      startDate: new Date("2025-01-01"),
      plannedEndDate: new Date("2027-12-31"),
      actualStartDate: new Date("2025-01-10"),
      assignedSiteIds: ["s0000001-0000-0000-0000-000000000001", "s0000002-0000-0000-0000-000000000002"],
      assignedEmployeeIds: [empSuresh.id, empVikram.id, empAnanya.id],
      assignedLabourerIds: ["l0000001-0000-0000-0000-000000000001", "l0000002-0000-0000-0000-000000000002", "l0000003-0000-0000-0000-000000000003"],
      overallProgressPercent: 38.5,
      createdAt: now,
      updatedAt: now,
    };

    this.projects.set(projectSkyline.id, projectSkyline);

    // 11. Authorized Construction Sites
    const siteTowerA: DbSite = {
      id: "s0000001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      siteCode: "SITE-SKY-TOWER-A",
      name: "Skyline Tower A & Basement Podium",
      description: "Commercial Office Tower G+24 with double basement civil works",
      siteEngineerId: empVikram.id,
      addressLine1: "Outer Ring Road, Near Bellandur Flyover",
      addressLine2: "Kadubeesanahalli Junction",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560103",
      status: "ACTIVE_CONSTRUCTION",
      latitude: 12.935242,
      longitude: 77.694602,
      radiusMeters: 150.0,
      maxAccuracyMeters: 50.0,
      createdAt: now,
      updatedAt: now,
    };

    const siteClubhouse: DbSite = {
      id: "s0000002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      siteCode: "SITE-SKY-CLUBHOUSE",
      name: "Skyline Central Amenity Hub & Clubhouse",
      description: "Central recreational structure and sports pavilion",
      siteEngineerId: empVikram.id,
      addressLine1: "Outer Ring Road, Bellandur East Gate",
      addressLine2: "Devarabisanahalli",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560103",
      status: "ACTIVE_CONSTRUCTION",
      latitude: 12.936500,
      longitude: 77.695800,
      radiusMeters: 80.0,
      maxAccuracyMeters: 40.0,
      createdAt: now,
      updatedAt: now,
    };

    this.sites.set(siteTowerA.id, siteTowerA);
    this.sites.set(siteClubhouse.id, siteClubhouse);

    // 12. Site Geofences
    const geofenceTowerA: DbSiteGeofence = {
      id: "g0000001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      siteId: siteTowerA.id,
      name: "Tower A Main Gate Circular Perimeter (150m)",
      geofenceType: "CIRCULAR",
      centerLatitude: 12.935242,
      centerLongitude: 77.694602,
      radiusMeters: 150.0,
      isActive: true,
      metadata: {
        maxAccuracyMeters: 50.0,
        gracePeriodMinutes: 15,
        requireSelfie: false,
        requireQr: false,
      },
      createdAt: now,
      updatedAt: now,
    };

    const geofenceClubhouse: DbSiteGeofence = {
      id: "g0000002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      siteId: siteClubhouse.id,
      name: "Clubhouse Amenity Hub Circular Perimeter (80m)",
      geofenceType: "CIRCULAR",
      centerLatitude: 12.936500,
      centerLongitude: 77.695800,
      radiusMeters: 80.0,
      isActive: true,
      metadata: {
        maxAccuracyMeters: 40.0,
        gracePeriodMinutes: 15,
        requireSelfie: false,
        requireQr: false,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.geofences.set(geofenceTowerA.id, geofenceTowerA);
    this.geofences.set(geofenceClubhouse.id, geofenceClubhouse);

    // 13. Geofence Configuration History
    this.geofenceHistories.push({
      id: "gh000001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      siteId: siteTowerA.id,
      geofenceId: geofenceTowerA.id,
      changedByUserId: apexAdminUser.id,
      oldRadiusMeters: 0,
      newRadiusMeters: 150.0,
      oldCenterLatitude: null,
      newCenterLatitude: 12.935242,
      oldCenterLongitude: null,
      newCenterLongitude: 77.694602,
      reason: "Initial baseline geofence configuration for Tower A perimeter",
      timestamp: new Date("2026-01-15T09:00:00Z"),
    });

    this.geofenceHistories.push({
      id: "gh000002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      siteId: siteClubhouse.id,
      geofenceId: geofenceClubhouse.id,
      changedByUserId: apexAdminUser.id,
      oldRadiusMeters: 0,
      newRadiusMeters: 80.0,
      oldCenterLatitude: null,
      newCenterLatitude: 12.936500,
      oldCenterLongitude: null,
      newCenterLongitude: 77.695800,
      reason: "Initial baseline geofence configuration for Clubhouse zone",
      timestamp: new Date("2026-01-15T09:05:00Z"),
    });

    // 14. Shifts
    const generalShift: DbShift = {
      id: "h0000001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      code: "GEN-DAY",
      name: "General Day Shift",
      startTime: "08:00:00",
      endTime: "17:00:00",
      gracePeriodMinutes: 15,
      breakDurationMinutes: 60,
      halfDayThresholdMinutes: 240,
      fullDayThresholdMinutes: 480,
      isNightShift: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const nightShift: DbShift = {
      id: "h0000002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      code: "NIGHT-POUR",
      name: "Night Concrete Pour Shift",
      startTime: "20:00:00",
      endTime: "05:00:00",
      gracePeriodMinutes: 15,
      breakDurationMinutes: 60,
      halfDayThresholdMinutes: 240,
      fullDayThresholdMinutes: 480,
      isNightShift: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.shifts.set(generalShift.id, generalShift);
    this.shifts.set(nightShift.id, nightShift);

    // 15. Site Assignments
    const assignVikramSite1: DbSiteAssignment = {
      id: "sa000001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      siteId: siteTowerA.id,
      assigneeType: "EMPLOYEE",
      employeeId: empVikram.id,
      roleOnSite: "Site In-Charge Engineer",
      assignedFrom: new Date("2026-01-15"),
      assignedTo: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const assignRameshSite1: DbSiteAssignment = {
      id: "sa000002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      siteId: siteTowerA.id,
      assigneeType: "LABOURER",
      labourerId: labRamesh.id,
      roleOnSite: "Head Mason",
      assignedFrom: new Date("2026-01-15"),
      assignedTo: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const assignAnsariSite1: DbSiteAssignment = {
      id: "sa000003-0000-0000-0000-000000000003",
      companyId: apexCompany.id,
      siteId: siteTowerA.id,
      assigneeType: "LABOURER",
      labourerId: labAnsari.id,
      roleOnSite: "Lead Bar Bender",
      assignedFrom: new Date("2026-01-15"),
      assignedTo: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.siteAssignments.set(assignVikramSite1.id, assignVikramSite1);
    this.siteAssignments.set(assignRameshSite1.id, assignRameshSite1);
    this.siteAssignments.set(assignAnsariSite1.id, assignAnsariSite1);

    // 12. Project Management Documents
    const pDoc1: DbProjectDocument = {
      id: "pdoc001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      documentType: "CONTRACT",
      title: "Main General Contractor Agreement (FIDIC Red Book)",
      fileName: "skyline_gc_contract_executed.pdf",
      fileUrl: "https://vault.construct360.local/projects/contracts/skyline_gc.pdf",
      fileSizeBytes: 4820120,
      version: "v1.0",
      uploadedByUserId: apexAdminUser.id,
      createdAt: new Date("2025-01-05"),
    };
    const pDoc2: DbProjectDocument = {
      id: "pdoc002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      documentType: "ARCHITECTURAL_DRAWING",
      title: "Tower A & Podium Working Architectural Drawings",
      fileName: "arch_tower_a_podium_rev4.dwg",
      fileUrl: "https://vault.construct360.local/projects/drawings/arch_tower_a.dwg",
      fileSizeBytes: 24500100,
      version: "R4",
      uploadedByUserId: pmUser.id,
      createdAt: new Date("2025-01-12"),
    };
    const pDoc3: DbProjectDocument = {
      id: "pdoc003-0000-0000-0000-000000000003",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      documentType: "BOQ",
      title: "Itemized Master BOQ & Civil Schedule of Rates",
      fileName: "skyline_itemized_boq_rev2.xlsx",
      fileUrl: "https://vault.construct360.local/projects/boq/skyline_boq.xlsx",
      fileSizeBytes: 1250800,
      version: "v2.1",
      uploadedByUserId: pmUser.id,
      createdAt: new Date("2025-01-15"),
    };

    this.projectDocuments.set(pDoc1.id, pDoc1);
    this.projectDocuments.set(pDoc2.id, pDoc2);
    this.projectDocuments.set(pDoc3.id, pDoc3);

    // 13. Project Audit History
    this.projectHistories.push(
      {
        id: "ph001",
        companyId: apexCompany.id,
        projectId: projectSkyline.id,
        eventType: "PROJECT_CREATED",
        description: "Project registered with initial budget of ₹380,000,000",
        changedByUserId: apexAdminUser.id,
        newValue: "PLANNING",
        effectiveDate: new Date("2025-01-01"),
        createdAt: new Date("2025-01-01"),
      },
      {
        id: "ph002",
        companyId: apexCompany.id,
        projectId: projectSkyline.id,
        eventType: "STATUS_CHANGE",
        description: "Status advanced to ACTIVE after site mobilization",
        changedByUserId: apexAdminUser.id,
        oldValue: "PLANNING",
        newValue: "ACTIVE",
        effectiveDate: new Date("2025-01-10"),
        createdAt: new Date("2025-01-10"),
      },
      {
        id: "ph003",
        companyId: apexCompany.id,
        projectId: projectSkyline.id,
        eventType: "MANAGER_ASSIGNED",
        description: "Suresh Kumar appointed as Project Manager",
        changedByUserId: apexAdminUser.id,
        newValue: pmUser.fullName,
        effectiveDate: new Date("2025-01-10"),
        createdAt: new Date("2025-01-10"),
      }
    );

    // 14. Work Breakdown Structure (WBS)
    const wbs1: DbWbsNode = {
      id: "wbs001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      wbsCode: "1.0",
      name: "Substructure & Deep Basements",
      description: "Earthwork, shoring systems, raft foundation and retaining walls",
      orderIndex: 1,
      createdAt: now,
    };
    const wbs2: DbWbsNode = {
      id: "wbs002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      wbsCode: "1.1",
      name: "Excavation, Soil Nailing & Dewatering",
      parentWbsId: wbs1.id,
      orderIndex: 2,
      createdAt: now,
    };
    const wbs3: DbWbsNode = {
      id: "wbs003-0000-0000-0000-000000000003",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      wbsCode: "1.2",
      name: "Raft Foundation & Waterproofing Barrier",
      parentWbsId: wbs1.id,
      orderIndex: 3,
      createdAt: now,
    };
    const wbs4: DbWbsNode = {
      id: "wbs004-0000-0000-0000-000000000004",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      wbsCode: "2.0",
      name: "Superstructure Reinforced Concrete Framing",
      description: "Columns, core shear walls, and post-tensioned slabs",
      orderIndex: 4,
      createdAt: now,
    };
    const wbs5: DbWbsNode = {
      id: "wbs005-0000-0000-0000-000000000005",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      wbsCode: "2.1",
      name: "Tower Columns & Central Core Walls",
      parentWbsId: wbs4.id,
      orderIndex: 5,
      createdAt: now,
    };
    const wbs6: DbWbsNode = {
      id: "wbs006-0000-0000-0000-000000000006",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      wbsCode: "2.2",
      name: "Post-Tensioned Slabs & Beams",
      parentWbsId: wbs4.id,
      orderIndex: 6,
      createdAt: now,
    };

    this.wbsNodes.set(wbs1.id, wbs1);
    this.wbsNodes.set(wbs2.id, wbs2);
    this.wbsNodes.set(wbs3.id, wbs3);
    this.wbsNodes.set(wbs4.id, wbs4);
    this.wbsNodes.set(wbs5.id, wbs5);
    this.wbsNodes.set(wbs6.id, wbs6);

    // 15. Project Tasks & Milestones
    const task1: DbProjectTask = {
      id: "tsk001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      wbsNodeId: wbs2.id,
      taskCode: "TSK-001",
      title: "Soil Excavation & Strut Shoring",
      description: "Deep pit bulk excavation down to -11.5m level with diaphragm anchor struts",
      priority: "CRITICAL",
      status: "COMPLETED",
      completionPercent: 100,
      isMilestone: false,
      plannedStartDate: new Date("2025-01-15"),
      plannedEndDate: new Date("2025-03-31"),
      actualStartDate: new Date("2025-01-15"),
      actualEndDate: new Date("2025-03-25"),
      assignedEmployeeIds: [empVikram.id],
      assignedContractorId: "c0000001-0000-0000-0000-000000000001",
      siteId: siteTowerA.id,
      plannedManHours: 3200,
      actualManHours: 3100,
      createdAt: now,
      updatedAt: now,
    };

    const task2: DbProjectTask = {
      id: "tsk002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      wbsNodeId: wbs3.id,
      taskCode: "TSK-002",
      title: "Raft Rebar Binding & Anti-Termite Layer",
      description: "Heavy 32mm bottom & top mesh rebar tying with waterproofing membrane",
      priority: "HIGH",
      status: "COMPLETED",
      completionPercent: 100,
      isMilestone: false,
      plannedStartDate: new Date("2025-04-01"),
      plannedEndDate: new Date("2025-05-30"),
      actualStartDate: new Date("2025-04-02"),
      actualEndDate: new Date("2025-05-28"),
      assignedEmployeeIds: [empVikram.id],
      assignedContractorId: "c0000001-0000-0000-0000-000000000001",
      siteId: siteTowerA.id,
      plannedManHours: 4500,
      actualManHours: 4420,
      createdAt: now,
      updatedAt: now,
    };

    const task3: DbProjectTask = {
      id: "tsk003-0000-0000-0000-000000000003",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      wbsNodeId: wbs3.id,
      taskCode: "TSK-003",
      title: "Raft Foundation Mass M35 Concrete Pour",
      description: "Continuous 36-hour mass concrete pour of 2,800 CUM with temperature sensors",
      priority: "CRITICAL",
      status: "COMPLETED",
      completionPercent: 100,
      isMilestone: true,
      milestoneTitle: "Raft Foundation Complete Sign-off",
      plannedStartDate: new Date("2025-06-01"),
      plannedEndDate: new Date("2025-06-15"),
      actualStartDate: new Date("2025-06-01"),
      actualEndDate: new Date("2025-06-12"),
      assignedEmployeeIds: [empSuresh.id, empVikram.id],
      siteId: siteTowerA.id,
      plannedManHours: 1800,
      actualManHours: 1750,
      createdAt: now,
      updatedAt: now,
    };

    const task4: DbProjectTask = {
      id: "tsk004-0000-0000-0000-000000000004",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      wbsNodeId: wbs5.id,
      taskCode: "TSK-004",
      title: "Basement 2 to 1 Columns & Retaining Wall",
      description: "Formwork erection and M40 concrete casting for basement 1 columns",
      priority: "HIGH",
      status: "IN_PROGRESS",
      completionPercent: 65,
      isMilestone: false,
      plannedStartDate: new Date("2025-06-16"),
      plannedEndDate: new Date("2025-08-31"),
      actualStartDate: new Date("2025-06-18"),
      assignedEmployeeIds: [empVikram.id],
      assignedContractorId: "c0000001-0000-0000-0000-000000000001",
      siteId: siteTowerA.id,
      plannedManHours: 5200,
      actualManHours: 3400,
      createdAt: now,
      updatedAt: now,
    };

    const task5: DbProjectTask = {
      id: "tsk005-0000-0000-0000-000000000005",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      wbsNodeId: wbs6.id,
      taskCode: "TSK-005",
      title: "Ground Floor Podium Slab Post-Tensioning",
      description: "Post-tensioned 300mm flat plate podium slab casting and stressing",
      priority: "CRITICAL",
      status: "NOT_STARTED",
      completionPercent: 0,
      isMilestone: true,
      milestoneTitle: "Plinth & Podium Level Casting",
      plannedStartDate: new Date("2025-09-01"),
      plannedEndDate: new Date("2025-10-31"),
      assignedEmployeeIds: [empSuresh.id, empVikram.id],
      siteId: siteTowerA.id,
      plannedManHours: 4200,
      createdAt: now,
      updatedAt: now,
    };

    const task6: DbProjectTask = {
      id: "tsk006-0000-0000-0000-000000000006",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      wbsNodeId: wbs6.id,
      taskCode: "TSK-006",
      title: "Tower A Structural Frame Level 1 to 10",
      description: "Typical floor slab casting cycle at 10 days per slab floor",
      priority: "MEDIUM",
      status: "NOT_STARTED",
      completionPercent: 0,
      isMilestone: false,
      plannedStartDate: new Date("2025-11-01"),
      plannedEndDate: new Date("2026-06-30"),
      assignedEmployeeIds: [empVikram.id],
      siteId: siteTowerA.id,
      plannedManHours: 18000,
      createdAt: now,
      updatedAt: now,
    };

    this.projectTasks.set(task1.id, task1);
    this.projectTasks.set(task2.id, task2);
    this.projectTasks.set(task3.id, task3);
    this.projectTasks.set(task4.id, task4);
    this.projectTasks.set(task5.id, task5);
    this.projectTasks.set(task6.id, task6);

    // 16. Task Dependencies (Gantt Predecessors)
    const dep1: DbTaskDependency = {
      id: "dep001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      taskId: task2.id,
      predecessorTaskId: task1.id,
      dependencyType: "FINISH_TO_START",
      lagDays: 0,
      createdAt: now,
    };
    const dep2: DbTaskDependency = {
      id: "dep002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      taskId: task3.id,
      predecessorTaskId: task2.id,
      dependencyType: "FINISH_TO_START",
      lagDays: 2,
      createdAt: now,
    };
    const dep3: DbTaskDependency = {
      id: "dep003-0000-0000-0000-000000000003",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      taskId: task4.id,
      predecessorTaskId: task3.id,
      dependencyType: "FINISH_TO_START",
      lagDays: 1,
      createdAt: now,
    };
    const dep4: DbTaskDependency = {
      id: "dep004-0000-0000-0000-000000000004",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      taskId: task5.id,
      predecessorTaskId: task4.id,
      dependencyType: "FINISH_TO_START",
      lagDays: 0,
      createdAt: now,
    };
    const dep5: DbTaskDependency = {
      id: "dep005-0000-0000-0000-000000000005",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      taskId: task6.id,
      predecessorTaskId: task5.id,
      dependencyType: "FINISH_TO_START",
      lagDays: 3,
      createdAt: now,
    };

    this.taskDependencies.set(dep1.id, dep1);
    this.taskDependencies.set(dep2.id, dep2);
    this.taskDependencies.set(dep3.id, dep3);
    this.taskDependencies.set(dep4.id, dep4);
    this.taskDependencies.set(dep5.id, dep5);

    // 17. Construction Progress Activities (BOQ Tracking)
    const act1: DbConstructionProgressActivity = {
      id: "act001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      taskId: task4.id,
      siteId: siteTowerA.id,
      activityCode: "ACT-CONC-M35",
      activityName: "Ready-Mix Concrete Grade M35 (Columns & Slabs)",
      trade: "CONCRETE",
      measurementUnit: "CUM",
      plannedQuantity: 12500,
      actualQuantityExecuted: 4850,
      ratePerUnit: 6400,
      status: "IN_EXECUTION",
      createdAt: now,
      updatedAt: now,
    };
    const act2: DbConstructionProgressActivity = {
      id: "act002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      taskId: task2.id,
      siteId: siteTowerA.id,
      activityCode: "ACT-STEEL-500D",
      activityName: "TMT Reinforcement Fe500D Steel Cutting, Bending & Binding",
      trade: "STEEL",
      measurementUnit: "MT",
      plannedQuantity: 1450,
      actualQuantityExecuted: 620,
      ratePerUnit: 78000,
      status: "IN_EXECUTION",
      createdAt: now,
      updatedAt: now,
    };
    const act3: DbConstructionProgressActivity = {
      id: "act003-0000-0000-0000-000000000003",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      taskId: task4.id,
      siteId: siteTowerA.id,
      activityCode: "ACT-FORMWORK-SHUT",
      activityName: "Film-Faced Shuttering Ply & Aluminium Formwork",
      trade: "FORMWORK",
      measurementUnit: "SQM",
      plannedQuantity: 42000,
      actualQuantityExecuted: 16800,
      ratePerUnit: 420,
      status: "IN_EXECUTION",
      createdAt: now,
      updatedAt: now,
    };
    const act4: DbConstructionProgressActivity = {
      id: "act004-0000-0000-0000-000000000004",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      siteId: siteTowerA.id,
      activityCode: "ACT-MASONRY-AAC",
      activityName: "200mm Autoclaved Aerated Concrete (AAC) Block Masonry",
      trade: "MASONRY",
      measurementUnit: "SQM",
      plannedQuantity: 28000,
      actualQuantityExecuted: 3200,
      ratePerUnit: 950,
      status: "IN_EXECUTION",
      createdAt: now,
      updatedAt: now,
    };

    this.progressActivities.set(act1.id, act1);
    this.progressActivities.set(act2.id, act2);
    this.progressActivities.set(act3.id, act3);
    this.progressActivities.set(act4.id, act4);

    // 18. Progress Measurement Logs with Engineer Verification Sign-Off
    const log1: DbProgressMeasurementLog = {
      id: "log001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      activityId: act1.id,
      measurementDate: new Date("2026-11-04"),
      quantityRecorded: 85,
      locationDescription: "Tower A Basement 1 Column Grid C2-E4",
      recordedByUserId: engineerUser.id,
      verificationStatus: "VERIFIED",
      verifiedByUserId: pmUser.id,
      verifiedAt: new Date("2026-11-05"),
      verificationNotes: "Cube test slump 120mm confirmed OK. Cube compression 7-day strength passed at 26.5 MPa.",
      sitePhotoUrls: ["https://construct360.local/cdn/photos/column_pour_grid_c2.jpg"],
      createdAt: new Date("2026-11-04"),
    };
    const log2: DbProgressMeasurementLog = {
      id: "log002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      activityId: act2.id,
      measurementDate: new Date("2026-11-07"),
      quantityRecorded: 14.5,
      locationDescription: "Tower A Podium Slab PT Tendons & Rebar Grid A1-D4",
      recordedByUserId: engineerUser.id,
      verificationStatus: "PENDING",
      sitePhotoUrls: ["https://construct360.local/cdn/photos/rebar_podium_mesh.jpg"],
      createdAt: new Date("2026-11-07"),
    };

    this.measurementLogs.set(log1.id, log1);
    this.measurementLogs.set(log2.id, log2);

    // 19. Delay Reporting Records
    const del1: DbProjectDelayRecord = {
      id: "del001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      taskId: task1.id,
      siteId: siteTowerA.id,
      delayReasonCategory: "WEATHER_MONSOON",
      delayDaysImpact: 6,
      title: "Unseasonal Cloudburst Pit Inundation",
      description: "Basement pit inundated with 1.2m rainwater; excavation paused while 3 submersible 15HP pumps dewatered sump.",
      mitigationAction: "Deployed additional high-head diesel trash pumps and excavated perimeter cutoff swales.",
      isCriticalPathImpact: false,
      reportedByUserId: engineerUser.id,
      status: "RESOLVED",
      resolvedAt: new Date("2025-02-18"),
      createdAt: new Date("2025-02-12"),
    };
    const del2: DbProjectDelayRecord = {
      id: "del002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      taskId: task2.id,
      siteId: siteTowerA.id,
      delayReasonCategory: "MATERIAL_SHORTAGE",
      delayDaysImpact: 4,
      title: "TMT Rebar Mill Transport Strike",
      description: "Interstate haulage strike delayed delivery of 45 MT 25mm dia reinforcement bars from primary steel producer.",
      mitigationAction: "Procured buffer stock from regional secondary warehouse distributor in Bommasandra.",
      isCriticalPathImpact: true,
      reportedByUserId: pmUser.id,
      status: "RESOLVED",
      resolvedAt: new Date("2025-04-20"),
      createdAt: new Date("2025-04-16"),
    };

    this.delayRecords.set(del1.id, del1);
    this.delayRecords.set(del2.id, del2);

    // 20. Project Financial Expenses
    const exp1: DbProjectExpense = {
      id: "exp001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      costCategory: "LABOUR",
      title: "Cumulative Labour Payroll Muster Disbursal (Q1-Q3)",
      amount: 14250000,
      date: new Date("2025-09-30"),
      referenceType: "LABOUR_PAYROLL",
      vendorOrBeneficiary: "Direct Labour Gangs & Staff",
      notes: "Direct wages for bar benders, masons, carpenters and helpers",
      createdAt: now,
    };
    const exp2: DbProjectExpense = {
      id: "exp002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      costCategory: "MATERIAL",
      title: "Ready-Mix Concrete & TMT Steel Consignments",
      amount: 48600000,
      date: new Date("2025-10-15"),
      referenceType: "MATERIAL_PO",
      vendorOrBeneficiary: "UltraTech RMC & JSW Steel Ltd",
      notes: "Bulk concrete supply and primary rebar bundles",
      createdAt: now,
    };
    const exp3: DbProjectExpense = {
      id: "exp003-0000-0000-0000-000000000003",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      costCategory: "EQUIPMENT",
      title: "Potain Tower Crane & Mobile Boom Placer Rental",
      amount: 6800000,
      date: new Date("2025-10-20"),
      referenceType: "EQUIPMENT_RENTAL",
      vendorOrBeneficiary: "Action Construction Equipment (ACE) Ltd",
      notes: "Tower crane monthly lease, operator charges and diesel generator fuel",
      createdAt: now,
    };
    const exp4: DbProjectExpense = {
      id: "exp004-0000-0000-0000-000000000004",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      costCategory: "CONTRACTOR",
      title: "Shree Balaji Labour Supply - RA Bills 1 to 4",
      amount: 18450000,
      date: new Date("2025-10-28"),
      referenceType: "CONTRACTOR_BILL",
      vendorOrBeneficiary: "Shree Balaji Labour Supply",
      notes: "Subcontractor certified work payments after 5% retention deduction",
      createdAt: now,
    };
    const exp5: DbProjectExpense = {
      id: "exp005-0000-0000-0000-000000000005",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      costCategory: "PERMITS_OVERHEAD",
      title: "Environmental Consent & Municipal Structural Stamping",
      amount: 2100000,
      date: new Date("2025-01-20"),
      referenceType: "DIRECT_VOUCHER",
      vendorOrBeneficiary: "Karnataka State Pollution Control Board & BBMP",
      notes: "Statutory statutory clearances and plan sanction scrutiny fee",
      createdAt: now,
    };

    this.projectExpenses.set(exp1.id, exp1);
    this.projectExpenses.set(exp2.id, exp2);
    this.projectExpenses.set(exp3.id, exp3);
    this.projectExpenses.set(exp4.id, exp4);
    this.projectExpenses.set(exp5.id, exp5);

    // 13. Inventory & Warehouse Management Seeding
    // ----------------------------------------------------------------------------
    // Warehouses
    const whCentral: DbWarehouse = {
      id: "wh000001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      warehouseCode: "WH-CEN-01",
      name: "Peenya Central Logistics Hub",
      warehouseType: "CENTRAL",
      address: "Plot 42, 4th Phase Peenya Industrial Area, Bangalore - 560058",
      managerUserId: apexAdminUser.id,
      contactPhone: "+919876500001",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const whProject: DbWarehouse = {
      id: "wh000002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      siteId: siteTowerA.id,
      warehouseCode: "WH-SKY-01",
      name: "Skyline Phase 2 Project Site Store",
      warehouseType: "SITE_STORE",
      address: "Tower A Staging Yard, Whitefield High-Tech Zone, Bangalore - 560066",
      managerUserId: pmUser.id,
      contactPhone: "+919876500002",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.warehouses.set(whCentral.id, whCentral);
    this.warehouses.set(whProject.id, whProject);

    // Storage Locations
    const locBayA1: DbStorageLocation = {
      id: "loc00001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      warehouseId: whCentral.id,
      locationCode: "BAY-A1-CEM",
      name: "Bay A1 - Cement Silo & Dry Staging",
      description: "Moisture-controlled covered bay with wooden pallet stacking",
      zone: "DRY_STORAGE",
      isActive: true,
      createdAt: now,
    };

    const locYardStl: DbStorageLocation = {
      id: "loc00002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      warehouseId: whCentral.id,
      locationCode: "YARD-STL-01",
      name: "Heavy Structural Steel & Rebar Yard",
      description: "Gantry crane accessible open staging yard with sleeper supports",
      zone: "OPEN_YARD",
      isActive: true,
      createdAt: now,
    };

    const locSiteStore: DbStorageLocation = {
      id: "loc00003-0000-0000-0000-000000000003",
      companyId: apexCompany.id,
      warehouseId: whProject.id,
      locationCode: "SITE-SEC-01",
      name: "Skyline Secure Tool & Chemical Room",
      description: "Lockable container shed for admixtures, paints and safety PPE",
      zone: "ENCLOSED_RACK",
      isActive: true,
      createdAt: now,
    };

    const locSiteYard: DbStorageLocation = {
      id: "loc00004-0000-0000-0000-000000000004",
      companyId: apexCompany.id,
      warehouseId: whProject.id,
      locationCode: "SITE-YARD-01",
      name: "Tower A Rebar Bending & Aggregate Yard",
      description: "Concrete hardstanding pad for sand and 20mm aggregate bunkers",
      zone: "OPEN_YARD",
      isActive: true,
      createdAt: now,
    };

    this.storageLocations.set(locBayA1.id, locBayA1);
    this.storageLocations.set(locYardStl.id, locYardStl);
    this.storageLocations.set(locSiteStore.id, locSiteStore);
    this.storageLocations.set(locSiteYard.id, locSiteYard);

    // Material Master (10 Core Construction Materials)
    const materialsList: DbMaterial[] = [
      {
        id: "mat00001-0000-0000-0000-000000000001",
        companyId: apexCompany.id,
        materialCode: "MAT-CEM-001",
        name: "UltraTech Super Portland Pozzolana Cement (PPC)",
        category: "CEMENT",
        unitOfMeasurement: "BAGS",
        brand: "UltraTech",
        specification: "IS 1489 Part 1 (Flyash based 53 Grade Equivalent)",
        standardRate: 380,
        preferredSupplier: "UltraTech Cement Ltd",
        minimumStock: 500,
        maximumStock: 10000,
        reorderLevel: 2000,
        hsnCode: "252329",
        gstPercent: 28,
        barcode: "890123400101",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "mat00002-0000-0000-0000-000000000002",
        companyId: apexCompany.id,
        materialCode: "MAT-STL-001",
        name: "Tata Tiscon Fe500D High Ductility TMT Rebar 16mm",
        category: "STEEL_REBAR",
        unitOfMeasurement: "MT",
        brand: "Tata Tiscon",
        specification: "IS 1786 Fe500D (Super Ductile, 12m length)",
        standardRate: 68500,
        preferredSupplier: "Tata Steel Ltd",
        minimumStock: 15,
        maximumStock: 150,
        reorderLevel: 30,
        hsnCode: "721420",
        gstPercent: 18,
        barcode: "890123400201",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "mat00003-0000-0000-0000-000000000003",
        companyId: apexCompany.id,
        materialCode: "MAT-SND-001",
        name: "Manufactured Sand (M-Sand Zone II Concreting Grade)",
        category: "AGGREGATES_SAND",
        unitOfMeasurement: "CUM",
        brand: "Robo Silicon",
        specification: "IS 383 Zone II Crushed Rock Sand (0-4.75mm)",
        standardRate: 2200,
        preferredSupplier: "Robo Silicon Aggregate Ltd",
        minimumStock: 40,
        maximumStock: 500,
        reorderLevel: 100,
        hsnCode: "250510",
        gstPercent: 5,
        barcode: "890123400301",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "mat00004-0000-0000-0000-000000000004",
        companyId: apexCompany.id,
        materialCode: "MAT-AGG-001",
        name: "20mm Graded Crushed Blue Metal Coarse Aggregate",
        category: "AGGREGATES_SAND",
        unitOfMeasurement: "CUM",
        brand: "Bidadi Blue Metal",
        specification: "IS 383 Machine-crushed granite aggregate (20mm down)",
        standardRate: 1650,
        preferredSupplier: "Bidadi Quarry & Crushers Ltd",
        minimumStock: 50,
        maximumStock: 600,
        reorderLevel: 120,
        hsnCode: "251710",
        gstPercent: 5,
        barcode: "890123400401",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "mat00005-0000-0000-0000-000000000005",
        companyId: apexCompany.id,
        materialCode: "MAT-BRK-001",
        name: "Wirecut High Compressive Strength Red Clay Bricks",
        category: "BRICKS_BLOCKS",
        unitOfMeasurement: "PCS",
        brand: "Godrej Construction",
        specification: "Class 1 10.5 N/mm² (230 x 115 x 75 mm)",
        standardRate: 12.5,
        preferredSupplier: "Godrej Brick Kilns Hub",
        minimumStock: 5000,
        maximumStock: 50000,
        reorderLevel: 15000,
        hsnCode: "690100",
        gstPercent: 12,
        barcode: "890123400501",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "mat00006-0000-0000-0000-000000000006",
        companyId: apexCompany.id,
        materialCode: "MAT-PIP-001",
        name: "Supreme CPVC SDR-11 Potable Water Pipe 1 inch",
        category: "PLUMBING_PIPES",
        unitOfMeasurement: "MTR",
        brand: "Supreme",
        specification: "ASTM D2846 / IS 15778 Schedule 40 pressure rating",
        standardRate: 145,
        preferredSupplier: "Supreme Industries Ltd",
        minimumStock: 100,
        maximumStock: 2000,
        reorderLevel: 300,
        hsnCode: "391723",
        gstPercent: 18,
        barcode: "890123400601",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "mat00007-0000-0000-0000-000000000007",
        companyId: apexCompany.id,
        materialCode: "MAT-PNT-001",
        name: "Asian Paints Apex Ultima Anti-Algal Exterior Emulsion",
        category: "FINISHING_PAINT",
        unitOfMeasurement: "LTR",
        brand: "Asian Paints",
        specification: "100% acrylic latex exterior paint with silicon additives",
        standardRate: 380,
        preferredSupplier: "Asian Paints Commercial Network",
        minimumStock: 40,
        maximumStock: 1000,
        reorderLevel: 100,
        hsnCode: "320910",
        gstPercent: 18,
        barcode: "890123400701",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "mat00008-0000-0000-0000-000000000008",
        companyId: apexCompany.id,
        materialCode: "MAT-PLY-001",
        name: "Film Faced Concrete Shuttering Plywood 12mm 34kg",
        category: "TIMBER_FORMWORK",
        unitOfMeasurement: "SQFT",
        brand: "Century Ply",
        specification: "IS 4990 Phenolic BWP mirror finish (8x4 ft sheet)",
        standardRate: 62,
        preferredSupplier: "Century Plyboards India Ltd",
        minimumStock: 200,
        maximumStock: 5000,
        reorderLevel: 800,
        hsnCode: "441232",
        gstPercent: 18,
        barcode: "890123400801",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "mat00009-0000-0000-0000-000000000009",
        companyId: apexCompany.id,
        materialCode: "MAT-CHM-001",
        name: "Sika Plastocrete Plus Water-Reducing Concrete Admixture",
        category: "CHEMICALS_ADMIXTURES",
        unitOfMeasurement: "LTR",
        brand: "Sika",
        specification: "IS 9103 / ASTM C494 Type A plasticizer & waterproofer",
        standardRate: 160,
        preferredSupplier: "Sika India Private Ltd",
        minimumStock: 100,
        maximumStock: 3000,
        reorderLevel: 300,
        hsnCode: "382440",
        gstPercent: 18,
        barcode: "890123400901",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "mat00010-0000-0000-0000-000000000010",
        companyId: apexCompany.id,
        materialCode: "MAT-PPE-001",
        name: "Karam Safety Industrial Hard Hat Helmet with Chin Strap",
        category: "SAFETY_PPE",
        unitOfMeasurement: "PCS",
        brand: "Karam",
        specification: "IS 2925 / CE EN 397 High impact polymer with 4-pt ratchet",
        standardRate: 280,
        preferredSupplier: "Karam Safety Equipment Ltd",
        minimumStock: 20,
        maximumStock: 500,
        reorderLevel: 50,
        hsnCode: "650610",
        gstPercent: 18,
        barcode: "890123401001",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const m of materialsList) {
      this.materials.set(m.id, m);
    }

    // Warehouse Stock Balances & Permanent Immutable Ledger Entries
    const stocksSeed: Array<{
      id: string;
      warehouseId: string;
      locationId: string;
      materialId: string;
      quantity: number;
      allocatedQuantity: number;
      averageUnitCost: number;
    }> = [
      // Peenya Central
      { id: "stk001", warehouseId: whCentral.id, locationId: locBayA1.id, materialId: materialsList[0].id, quantity: 3500, allocatedQuantity: 400, averageUnitCost: 375 },
      { id: "stk002", warehouseId: whCentral.id, locationId: locYardStl.id, materialId: materialsList[1].id, quantity: 65.45, allocatedQuantity: 10, averageUnitCost: 68000 },
      { id: "stk003", warehouseId: whCentral.id, locationId: locBayA1.id, materialId: materialsList[5].id, quantity: 600, allocatedQuantity: 0, averageUnitCost: 142 },
      { id: "stk004", warehouseId: whCentral.id, locationId: locBayA1.id, materialId: materialsList[6].id, quantity: 240, allocatedQuantity: 0, averageUnitCost: 375 },
      // Skyline Project Store
      { id: "stk005", warehouseId: whProject.id, locationId: locSiteYard.id, materialId: materialsList[0].id, quantity: 1200, allocatedQuantity: 0, averageUnitCost: 380 },
      { id: "stk006", warehouseId: whProject.id, locationId: locSiteYard.id, materialId: materialsList[1].id, quantity: 22.80, allocatedQuantity: 0, averageUnitCost: 68500 },
      { id: "stk007", warehouseId: whProject.id, locationId: locSiteYard.id, materialId: materialsList[2].id, quantity: 180.00, allocatedQuantity: 0, averageUnitCost: 2200 },
      { id: "stk008", warehouseId: whProject.id, locationId: locSiteYard.id, materialId: materialsList[3].id, quantity: 210.00, allocatedQuantity: 0, averageUnitCost: 1650 },
      { id: "stk009", warehouseId: whProject.id, locationId: locSiteYard.id, materialId: materialsList[4].id, quantity: 18500, allocatedQuantity: 0, averageUnitCost: 12.5 },
      { id: "stk010", warehouseId: whProject.id, locationId: locSiteYard.id, materialId: materialsList[7].id, quantity: 1600, allocatedQuantity: 0, averageUnitCost: 60 },
      { id: "stk011", warehouseId: whProject.id, locationId: locSiteStore.id, materialId: materialsList[8].id, quantity: 450, allocatedQuantity: 0, averageUnitCost: 158 },
      { id: "stk012", warehouseId: whProject.id, locationId: locSiteStore.id, materialId: materialsList[9].id, quantity: 85, allocatedQuantity: 0, averageUnitCost: 280 },
    ];

    stocksSeed.forEach((stk) => {
      const stockItem: DbWarehouseStock = {
        id: stk.id,
        companyId: apexCompany.id,
        warehouseId: stk.warehouseId,
        storageLocationId: stk.locationId,
        materialId: stk.materialId,
        quantity: stk.quantity,
        allocatedQuantity: stk.allocatedQuantity,
        availableQuantity: stk.quantity - stk.allocatedQuantity,
        averageUnitCost: stk.averageUnitCost,
        lastMovementDate: new Date("2026-01-15"),
        updatedAt: now,
      };
      this.warehouseStocks.set(stockItem.id, stockItem);

      // Create initial immutable ledger transaction entry
      const mat = this.materials.get(stk.materialId)!;
      const ledgerEntry: DbStockLedgerEntry = {
        id: randomUUID(),
        companyId: apexCompany.id,
        projectId: stk.warehouseId === whProject.id ? projectSkyline.id : undefined,
        siteId: stk.warehouseId === whProject.id ? siteTowerA.id : undefined,
        transactionType: "OPENING_STOCK",
        materialId: stk.materialId,
        destinationWarehouseId: stk.warehouseId,
        destinationLocationId: stk.locationId,
        quantity: stk.quantity,
        unit: mat.unitOfMeasurement,
        unitCost: stk.averageUnitCost,
        totalValue: Math.round(stk.quantity * stk.averageUnitCost),
        referenceType: "DIRECT_MANUAL",
        referenceNumber: "OPN-2026-001",
        performedByUserId: apexAdminUser.id,
        timestamp: new Date("2026-01-01"),
        remarks: "Opening inventory stock balance verified by audit committee",
      };
      this.stockLedger.set(ledgerEntry.id, ledgerEntry);
    });

    // Material Requests (Indents)
    const mr1: DbMaterialRequest = {
      id: "mr00001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      siteId: siteTowerA.id,
      requestCode: "MR-APEX-0001",
      priority: "HIGH",
      requestedByUserId: engineerUser.id, // Vikram
      approvedByUserId: pmUser.id, // Suresh
      approvalNotes: "Approved for Tower A Podium 1 concrete pouring schedule",
      sourceWarehouseId: whCentral.id,
      targetSiteId: siteTowerA.id,
      dateRequired: new Date("2026-03-01"),
      status: "PM_APPROVED",
      items: [
        {
          id: randomUUID(),
          requestId: "mr00001-0000-0000-0000-000000000001",
          materialId: materialsList[0].id, // UltraTech Cement
          requestedQuantity: 500,
          approvedQuantity: 500,
          issuedQuantity: 0,
          unit: "BAGS",
          remarks: "Podium 1 M35 Mix",
        },
        {
          id: randomUUID(),
          requestId: "mr00001-0000-0000-0000-000000000001",
          materialId: materialsList[1].id, // 16mm Rebar
          requestedQuantity: 10,
          approvedQuantity: 10,
          issuedQuantity: 0,
          unit: "MT",
          remarks: "Retaining wall reinforcement",
        },
      ],
      createdAt: new Date("2026-02-10"),
      updatedAt: now,
    };

    const mr2: DbMaterialRequest = {
      id: "mr00002-0000-0000-0000-000000000002",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      siteId: siteTowerA.id,
      requestCode: "MR-APEX-0002",
      priority: "NORMAL",
      requestedByUserId: engineerUser.id,
      approvedByUserId: pmUser.id,
      approvalNotes: "Fulfilled directly from Skyline Site Yard",
      sourceWarehouseId: whProject.id,
      targetSiteId: siteTowerA.id,
      dateRequired: new Date("2026-01-20"),
      status: "DELIVERED",
      items: [
        {
          id: randomUUID(),
          requestId: "mr00002-0000-0000-0000-000000000002",
          materialId: materialsList[0].id,
          requestedQuantity: 200,
          approvedQuantity: 200,
          issuedQuantity: 200,
          unit: "BAGS",
          remarks: "Footing blinding concrete",
        },
        {
          id: randomUUID(),
          requestId: "mr00002-0000-0000-0000-000000000002",
          materialId: materialsList[2].id,
          requestedQuantity: 50,
          approvedQuantity: 50,
          issuedQuantity: 50,
          unit: "CUM",
          remarks: "Footing PCC",
        },
      ],
      createdAt: new Date("2026-01-18"),
      updatedAt: new Date("2026-01-20"),
    };

    const mr3: DbMaterialRequest = {
      id: "mr00003-0000-0000-0000-000000000003",
      companyId: apexCompany.id,
      projectId: projectSkyline.id,
      siteId: siteTowerA.id,
      requestCode: "MR-APEX-0003",
      priority: "URGENT",
      requestedByUserId: engineerUser.id,
      targetSiteId: siteTowerA.id,
      dateRequired: new Date("2026-03-05"),
      status: "SUBMITTED",
      items: [
        {
          id: randomUUID(),
          requestId: "mr00003-0000-0000-0000-000000000003",
          materialId: materialsList[8].id, // Sika Admixture
          requestedQuantity: 80,
          issuedQuantity: 0,
          unit: "LTR",
          remarks: "Retarder admixture for long haul RMC pour",
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    this.materialRequests.set(mr1.id, mr1);
    this.materialRequests.set(mr2.id, mr2);
    this.materialRequests.set(mr3.id, mr3);

    // Stock Transfer
    const st1: DbStockTransfer = {
      id: "st00001-0000-0000-0000-000000000001",
      companyId: apexCompany.id,
      transferCode: "STC-2026-001",
      sourceWarehouseId: whCentral.id,
      destinationWarehouseId: whProject.id,
      materialId: materialsList[0].id, // UltraTech Cement
      quantity: 400,
      unit: "BAGS",
      status: "DISPATCHED",
      initiatedByUserId: apexAdminUser.id,
      dispatchedAt: new Date("2026-02-28"),
      vehicleNumber: "KA-04-AB-8821",
      challanNumber: "CHL-2026-0912",
      notes: "Transit to Skyline Phase 2 for upcoming floor casting",
      createdAt: new Date("2026-02-27"),
      updatedAt: new Date("2026-02-28"),
    };
    this.stockTransfers.set(st1.id, st1);

    // Supplier Price History
    const sph1: DbSupplierPriceHistory = {
      id: "sph001",
      companyId: apexCompany.id,
      materialId: materialsList[0].id,
      supplierName: "UltraTech Cement Ltd",
      unitRate: 365,
      effectiveDate: new Date("2025-06-01"),
      grnReferenceNumber: "GRN-2025-0012",
      notes: "Annual rate contract Q2",
    };
    const sph2: DbSupplierPriceHistory = {
      id: "sph002",
      companyId: apexCompany.id,
      materialId: materialsList[0].id,
      supplierName: "UltraTech Cement Ltd",
      unitRate: 380,
      effectiveDate: new Date("2026-01-05"),
      grnReferenceNumber: "GRN-2026-0004",
      notes: "Price revision due to raw coal cost hike",
    };
    const sph3: DbSupplierPriceHistory = {
      id: "sph003",
      companyId: apexCompany.id,
      materialId: materialsList[1].id,
      supplierName: "Tata Steel Ltd",
      unitRate: 66000,
      effectiveDate: new Date("2025-08-15"),
      grnReferenceNumber: "GRN-2025-0044",
      notes: "Monsoon bulk booking discount",
    };
    const sph4: DbSupplierPriceHistory = {
      id: "sph004",
      companyId: apexCompany.id,
      materialId: materialsList[1].id,
      supplierName: "Tata Steel Ltd",
      unitRate: 68500,
      effectiveDate: new Date("2026-01-10"),
      grnReferenceNumber: "GRN-2026-0008",
      notes: "Direct mill dispatch rate",
    };

    this.supplierPriceHistories.set(sph1.id, sph1);
    this.supplierPriceHistories.set(sph2.id, sph2);
    this.supplierPriceHistories.set(sph3.id, sph3);
    this.supplierPriceHistories.set(sph4.id, sph4);
  }
}

// Global Singleton Store Instance
const globalForStore = globalThis as unknown as { construct360Store?: DataStore };
export const dataStore = globalForStore.construct360Store || new DataStore();
if (process.env.NODE_ENV !== "production") globalForStore.construct360Store = dataStore;
