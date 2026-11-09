// ==============================================================================
// WORKFORCE REPOSITORY
// High-Fidelity Data Access for Employees, Labourers, Contractors & Workforce Payroll
// ==============================================================================

import { randomUUID } from "node:crypto";
import { db } from "../../db/client";
import type {
  DbCompanyAnnouncement,
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
} from "../../db/types";
import type {
  CreateContractorInput,
  CreateEmployeeInput,
  CreateLabourerInput,
  LabourWageCalculationResult,
  QueryContractorsParams,
  QueryEmployeesParams,
  QueryLabourersParams,
  RecordContractorPaymentInput,
  SubmitContractorBillInput,
  UpdateContractorInput,
  UpdateEmployeeInput,
  UpdateLabourerInput,
  WorkforceDashboardSummary,
} from "./workforce.types";

export class WorkforceRepository {
  // ----------------------------------------------------------------------------
  // EMPLOYEE MANAGEMENT
  // ----------------------------------------------------------------------------

  public async findEmployeeById(id: string): Promise<DbEmployee | null> {
    const store = db.getStore();
    return store.employees.get(id) || null;
  }

  public async findEmployeeByUserId(userId: string): Promise<DbEmployee | null> {
    const store = db.getStore();
    for (const emp of store.employees.values()) {
      if (emp.userId === userId) {
        return emp;
      }
    }
    return null;
  }

  public async generateNextEmployeeCode(companyId: string): Promise<string> {
    const store = db.getStore();
    const company = store.companies.get(companyId);
    const prefix = company ? company.code.split("-")[0] : "APEX";

    let maxNum = 0;
    for (const emp of store.employees.values()) {
      if (emp.companyId === companyId) {
        const match = emp.employeeCode.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    const nextNum = (maxNum + 1).toString().padStart(3, "0");
    return `EMP-${prefix}-${nextNum}`;
  }

  public async findEmployees(
    companyId: string,
    params: QueryEmployeesParams
  ): Promise<{ data: DbEmployee[]; total: number }> {
    const store = db.getStore();
    let list = Array.from(store.employees.values()).filter((e) => e.companyId === companyId);

    if (params.status) {
      list = list.filter((e) => e.status === params.status);
    }
    if (params.employmentType) {
      list = list.filter((e) => e.employmentType === params.employmentType);
    }
    if (params.departmentId) {
      list = list.filter((e) => e.departmentId === params.departmentId);
    }
    if (params.designationId) {
      list = list.filter((e) => e.designationId === params.designationId);
    }
    if (params.siteId) {
      list = list.filter((e) => e.assignedSiteId === params.siteId);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (e) =>
          e.firstName.toLowerCase().includes(q) ||
          e.lastName.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q) ||
          (e.email && e.email.toLowerCase().includes(q)) ||
          e.phone.includes(q)
      );
    }

    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = list.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    return { data: list.slice(offset, offset + limit), total };
  }

  public async createEmployee(
    companyId: string,
    input: CreateEmployeeInput,
    userId: string
  ): Promise<DbEmployee> {
    return db.transaction(async (store) => {
      const now = new Date();
      const empId = randomUUID();
      const employeeCode = await this.generateNextEmployeeCode(companyId);

      const employee: DbEmployee = {
        id: empId,
        companyId,
        branchId: null,
        userId: null,
        departmentId: input.departmentId || null,
        designationId: input.designationId || null,
        reportingManagerId: input.reportingManagerId || null,
        assignedProjectId: input.assignedProjectId || null,
        assignedSiteId: input.assignedSiteId || null,
        employeeCode,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: input.email?.trim() || null,
        phone: input.phone.trim(),
        employmentType: input.employmentType || "PERMANENT",
        status: "ACTIVE",
        joiningDate: new Date(input.joiningDate),
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        gender: input.gender || null,
        maritalStatus: input.maritalStatus || null,
        bloodGroup: input.bloodGroup || null,
        nationality: input.nationality || "Indian",
        address: input.address?.trim() || null,
        emergencyContactName: input.emergencyContactName?.trim() || null,
        emergencyContactPhone: input.emergencyContactPhone?.trim() || null,
        emergencyContactRelation: input.emergencyContactRelation?.trim() || null,
        panNumber: input.panNumber?.trim() || null,
        aadhaarNumber: input.aadhaarNumber?.trim() || null,
        bankAccountNumber: input.bankAccountNumber?.trim() || null,
        bankIfsc: input.bankIfsc?.trim() || null,
        bankName: input.bankName?.trim() || null,
        photoUrl: input.photoUrl || null,
        createdAt: now,
        updatedAt: now,
      };

      store.employees.set(employee.id, employee);

      // Create salary structure if baseSalary provided
      if (input.baseSalary !== undefined && input.baseSalary > 0) {
        const salId = randomUUID();
        const salaryStructure: DbSalaryStructure = {
          id: salId,
          companyId,
          employeeId: employee.id,
          baseSalary: input.baseSalary,
          hra: input.hra ?? Math.round(input.baseSalary * 0.4),
          conveyanceAllowance: input.conveyanceAllowance ?? 3000,
          siteAllowance: input.siteAllowance ?? 5000,
          specialAllowance: 2000,
          pfEmployeePercent: 12.0,
          esiEmployeePercent: input.baseSalary < 21000 ? 0.75 : 0.0,
          professionalTax: 200,
          effectiveFrom: employee.joiningDate,
          createdAt: now,
          updatedAt: now,
        };
        store.salaryStructures.set(employee.id, salaryStructure);
      }

      // Initial history log
      store.employeeHistories.push({
        id: randomUUID(),
        companyId,
        employeeId: employee.id,
        eventType: "JOINED",
        description: `Registered as ${employee.employmentType} employee`,
        changedByUserId: userId,
        effectiveDate: employee.joiningDate,
        createdAt: now,
      });

      // Initialize default leave balances
      for (const lt of store.leaveTypes.values()) {
        if (lt.companyId === companyId) {
          const lbKey = `${employee.id}_${lt.id}`;
          store.leaveBalances.set(lbKey, {
            id: randomUUID(),
            companyId,
            employeeId: employee.id,
            leaveTypeId: lt.id,
            year: new Date().getFullYear(),
            allocatedDays: lt.annualDaysAllowed,
            usedDays: 0,
            pendingDays: 0,
          });
        }
      }

      // If assigned site, also create site assignment
      if (input.assignedSiteId) {
        store.siteAssignments.set(randomUUID(), {
          id: randomUUID(),
          companyId,
          siteId: input.assignedSiteId,
          assigneeType: "EMPLOYEE",
          employeeId: employee.id,
          roleOnSite: "Staff",
          assignedFrom: employee.joiningDate,
          assignedTo: null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }

      return employee;
    });
  }

  public async updateEmployee(
    id: string,
    input: UpdateEmployeeInput,
    userId: string
  ): Promise<DbEmployee | null> {
    return db.transaction(async (store) => {
      const employee = store.employees.get(id);
      if (!employee) return null;

      const now = new Date();

      if (input.firstName !== undefined) employee.firstName = input.firstName.trim();
      if (input.lastName !== undefined) employee.lastName = input.lastName.trim();
      if (input.email !== undefined) employee.email = input.email?.trim() || null;
      if (input.phone !== undefined) employee.phone = input.phone.trim();
      if (input.departmentId !== undefined) {
        if (employee.departmentId !== input.departmentId) {
          store.employeeHistories.push({
            id: randomUUID(),
            companyId: employee.companyId,
            employeeId: employee.id,
            eventType: "DEPARTMENT_TRANSFER",
            description: "Department reassigned",
            changedByUserId: userId,
            oldValue: employee.departmentId || "None",
            newValue: input.departmentId || "None",
            effectiveDate: now,
            createdAt: now,
          });
        }
        employee.departmentId = input.departmentId;
      }
      if (input.designationId !== undefined) {
        if (employee.designationId !== input.designationId) {
          store.employeeHistories.push({
            id: randomUUID(),
            companyId: employee.companyId,
            employeeId: employee.id,
            eventType: "DESIGNATION_CHANGE",
            description: "Designation title modified",
            changedByUserId: userId,
            oldValue: employee.designationId || "None",
            newValue: input.designationId || "None",
            effectiveDate: now,
            createdAt: now,
          });
        }
        employee.designationId = input.designationId;
      }
      if (input.status !== undefined && employee.status !== input.status) {
        store.employeeHistories.push({
          id: randomUUID(),
          companyId: employee.companyId,
          employeeId: employee.id,
          eventType: "STATUS_CHANGE",
          description: `Employment status changed from ${employee.status} to ${input.status}`,
          changedByUserId: userId,
          oldValue: employee.status,
          newValue: input.status,
          effectiveDate: now,
          createdAt: now,
        });
        employee.status = input.status;
      }
      if (input.employmentType !== undefined) employee.employmentType = input.employmentType;
      if (input.assignedProjectId !== undefined) employee.assignedProjectId = input.assignedProjectId;
      if (input.assignedSiteId !== undefined) {
        if (employee.assignedSiteId !== input.assignedSiteId) {
          store.employeeHistories.push({
            id: randomUUID(),
            companyId: employee.companyId,
            employeeId: employee.id,
            eventType: "SITE_TRANSFER",
            description: "Site posting relocated",
            changedByUserId: userId,
            oldValue: employee.assignedSiteId || "None",
            newValue: input.assignedSiteId || "None",
            effectiveDate: now,
            createdAt: now,
          });
        }
        employee.assignedSiteId = input.assignedSiteId;
      }
      if (input.reportingManagerId !== undefined) employee.reportingManagerId = input.reportingManagerId;
      if (input.address !== undefined) employee.address = input.address;
      if (input.emergencyContactName !== undefined) employee.emergencyContactName = input.emergencyContactName;
      if (input.emergencyContactPhone !== undefined) employee.emergencyContactPhone = input.emergencyContactPhone;
      if (input.panNumber !== undefined) employee.panNumber = input.panNumber;
      if (input.aadhaarNumber !== undefined) employee.aadhaarNumber = input.aadhaarNumber;
      if (input.bankAccountNumber !== undefined) employee.bankAccountNumber = input.bankAccountNumber;
      if (input.bankIfsc !== undefined) employee.bankIfsc = input.bankIfsc;
      if (input.bankName !== undefined) employee.bankName = input.bankName;
      if (input.photoUrl !== undefined) employee.photoUrl = input.photoUrl;
      if (input.exitDate !== undefined) employee.exitDate = input.exitDate ? new Date(input.exitDate) : null;

      employee.updatedAt = now;

      // Update salary structure if provided
      if (input.baseSalary !== undefined) {
        const sal = store.salaryStructures.get(employee.id) || {
          id: randomUUID(),
          companyId: employee.companyId,
          employeeId: employee.id,
          baseSalary: input.baseSalary,
          hra: 0,
          conveyanceAllowance: 0,
          siteAllowance: 0,
          specialAllowance: 0,
          pfEmployeePercent: 12.0,
          esiEmployeePercent: 0.0,
          professionalTax: 200,
          effectiveFrom: now,
          createdAt: now,
          updatedAt: now,
        };
        sal.baseSalary = input.baseSalary;
        if (input.hra !== undefined) sal.hra = input.hra;
        if (input.conveyanceAllowance !== undefined) sal.conveyanceAllowance = input.conveyanceAllowance;
        if (input.siteAllowance !== undefined) sal.siteAllowance = input.siteAllowance;
        sal.updatedAt = now;
        store.salaryStructures.set(employee.id, sal);
      }

      return employee;
    });
  }

  public async getEmployeeDocuments(employeeId: string): Promise<DbEmployeeDocument[]> {
    const store = db.getStore();
    return Array.from(store.employeeDocuments.values()).filter((d) => d.employeeId === employeeId);
  }

  public async addEmployeeDocument(doc: DbEmployeeDocument): Promise<DbEmployeeDocument> {
    const store = db.getStore();
    store.employeeDocuments.set(doc.id, doc);
    return doc;
  }

  public async verifyEmployeeDocument(
    docId: string,
    status: "VERIFIED" | "REJECTED",
    userId: string,
    rejectionReason?: string
  ): Promise<DbEmployeeDocument | null> {
    const store = db.getStore();
    const doc = store.employeeDocuments.get(docId);
    if (!doc) return null;

    doc.verificationStatus = status;
    doc.verifiedByUserId = userId;
    doc.verifiedAt = new Date();
    doc.rejectionReason = rejectionReason || null;
    return doc;
  }

  public async getEmployeeHistory(employeeId: string): Promise<DbEmployeeHistory[]> {
    const store = db.getStore();
    return store.employeeHistories
      .filter((h) => h.employeeId === employeeId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async getSalaryStructure(employeeId: string): Promise<DbSalaryStructure | null> {
    const store = db.getStore();
    return store.salaryStructures.get(employeeId) || null;
  }

  // ----------------------------------------------------------------------------
  // LABOUR MANAGEMENT
  // ----------------------------------------------------------------------------

  public async findLabourerById(id: string): Promise<DbLabourer | null> {
    const store = db.getStore();
    return store.labourers.get(id) || null;
  }

  public async generateNextLabourerCode(companyId: string): Promise<string> {
    const store = db.getStore();
    let maxNum = 0;
    for (const lab of store.labourers.values()) {
      if (lab.companyId === companyId) {
        const match = lab.labourerCode.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }
    const nextNum = (maxNum + 1).toString().padStart(3, "0");
    return `LAB-${nextNum}`;
  }

  public async findLabourers(
    companyId: string,
    params: QueryLabourersParams
  ): Promise<{ data: DbLabourer[]; total: number }> {
    const store = db.getStore();
    let list = Array.from(store.labourers.values()).filter((l) => l.companyId === companyId);

    if (params.trade) {
      list = list.filter((l) => l.primaryTrade === params.trade);
    }
    if (params.skillLevel) {
      list = list.filter((l) => l.skillLevel === params.skillLevel);
    }
    if (params.contractorId) {
      list = list.filter((l) => l.contractorId === params.contractorId);
    }
    if (params.siteId) {
      list = list.filter((l) => l.currentSiteId === params.siteId);
    }
    if (params.availabilityStatus) {
      list = list.filter((l) => l.availabilityStatus === params.availabilityStatus);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (l) =>
          l.firstName.toLowerCase().includes(q) ||
          l.lastName.toLowerCase().includes(q) ||
          l.labourerCode.toLowerCase().includes(q) ||
          l.primaryTrade.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = list.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    return { data: list.slice(offset, offset + limit), total };
  }

  public async createLabourer(companyId: string, input: CreateLabourerInput): Promise<DbLabourer> {
    return db.transaction(async (store) => {
      const now = new Date();
      const labId = randomUUID();
      const labourerCode = await this.generateNextLabourerCode(companyId);

      const labourer: DbLabourer = {
        id: labId,
        companyId,
        contractorId: input.contractorId || null,
        labourerCode,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim() || null,
        skillLevel: input.skillLevel,
        primaryTrade: input.primaryTrade,
        dailyWageRate: input.dailyWageRate,
        hourlyWageRate: input.hourlyWageRate ?? Math.round(input.dailyWageRate / 8),
        pieceRateWage: input.pieceRateWage ?? 0,
        groupName: input.groupName?.trim() || null,
        availabilityStatus: "AVAILABLE",
        currentProjectId: input.currentProjectId || null,
        currentSiteId: input.currentSiteId || null,
        emergencyPhone: input.emergencyPhone?.trim() || null,
        idProofType: input.idProofType || null,
        idProofNumber: input.idProofNumber || null,
        photoUrl: input.photoUrl || null,
        biometricEnrolled: false,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      store.labourers.set(labourer.id, labourer);

      if (input.currentSiteId) {
        store.siteAssignments.set(randomUUID(), {
          id: randomUUID(),
          companyId,
          siteId: input.currentSiteId,
          assigneeType: "LABOURER",
          labourerId: labourer.id,
          roleOnSite: labourer.primaryTrade,
          assignedFrom: now,
          assignedTo: null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }

      return labourer;
    });
  }

  public async updateLabourer(id: string, input: UpdateLabourerInput): Promise<DbLabourer | null> {
    const store = db.getStore();
    const labourer = store.labourers.get(id);
    if (!labourer) return null;

    const now = new Date();
    if (input.firstName !== undefined) labourer.firstName = input.firstName.trim();
    if (input.lastName !== undefined) labourer.lastName = input.lastName.trim();
    if (input.phone !== undefined) labourer.phone = input.phone?.trim() || null;
    if (input.contractorId !== undefined) labourer.contractorId = input.contractorId;
    if (input.skillLevel !== undefined) labourer.skillLevel = input.skillLevel;
    if (input.primaryTrade !== undefined) labourer.primaryTrade = input.primaryTrade;
    if (input.dailyWageRate !== undefined) labourer.dailyWageRate = input.dailyWageRate;
    if (input.hourlyWageRate !== undefined) labourer.hourlyWageRate = input.hourlyWageRate;
    if (input.pieceRateWage !== undefined) labourer.pieceRateWage = input.pieceRateWage;
    if (input.groupName !== undefined) labourer.groupName = input.groupName;
    if (input.availabilityStatus !== undefined) labourer.availabilityStatus = input.availabilityStatus;
    if (input.currentSiteId !== undefined) labourer.currentSiteId = input.currentSiteId;
    if (input.isActive !== undefined) labourer.isActive = input.isActive;

    labourer.updatedAt = now;
    return labourer;
  }

  public async requestAdvance(advance: DbLabourWageAdvance): Promise<DbLabourWageAdvance> {
    const store = db.getStore();
    store.labourAdvances.set(advance.id, advance);
    return advance;
  }

  public async reviewAdvance(
    advanceId: string,
    decision: "APPROVED" | "REJECTED",
    userId: string
  ): Promise<DbLabourWageAdvance | null> {
    const store = db.getStore();
    const adv = store.labourAdvances.get(advanceId);
    if (!adv) return null;

    adv.status = decision;
    adv.approvedByUserId = userId;
    adv.approvedAt = new Date();
    return adv;
  }

  public async getLabourAdvances(labourerId: string): Promise<DbLabourWageAdvance[]> {
    const store = db.getStore();
    return Array.from(store.labourAdvances.values()).filter((a) => a.labourerId === labourerId);
  }

  public async requestTransfer(transfer: DbLabourTransfer): Promise<DbLabourTransfer> {
    const store = db.getStore();
    store.labourTransfers.set(transfer.id, transfer);
    return transfer;
  }

  public async reviewTransfer(
    transferId: string,
    decision: "APPROVED" | "REJECTED",
    userId: string
  ): Promise<DbLabourTransfer | null> {
    return db.transaction(async (store) => {
      const tr = store.labourTransfers.get(transferId);
      if (!tr) return null;

      tr.status = decision;
      tr.approvedByUserId = userId;
      tr.approvedAt = new Date();

      if (decision === "APPROVED") {
        const lab = store.labourers.get(tr.labourerId);
        if (lab) {
          lab.currentSiteId = tr.toSiteId;
          lab.updatedAt = new Date();

          // Create updated site assignment
          store.siteAssignments.set(randomUUID(), {
            id: randomUUID(),
            companyId: lab.companyId,
            siteId: tr.toSiteId,
            assigneeType: "LABOURER",
            labourerId: lab.id,
            roleOnSite: lab.primaryTrade,
            assignedFrom: tr.transferDate,
            assignedTo: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      return tr;
    });
  }

  public async calculateLabourWage(
    companyId: string,
    labourerId: string,
    daysPresentCount?: number,
    overtimeHoursCount?: number,
    pieceUnitsCount?: number
  ): Promise<LabourWageCalculationResult | null> {
    const store = db.getStore();
    const labourer = store.labourers.get(labourerId);
    if (!labourer || labourer.companyId !== companyId) return null;

    // Count days from attendance_sessions if not manually provided
    let daysPresent = daysPresentCount ?? 0;
    let overtimeHours = overtimeHoursCount ?? 0;

    if (daysPresentCount === undefined) {
      const sessions = Array.from(store.attendanceSessions.values()).filter(
        (s) => s.labourerId === labourerId && s.status === "PRESENT"
      );
      daysPresent = sessions.length;
      const totalOvertimeMins = sessions.reduce((acc, s) => acc + (s.overtimeMinutes || 0), 0);
      overtimeHours = Math.round((totalOvertimeMins / 60) * 10) / 10;
    }

    const basicWages = Math.round(daysPresent * labourer.dailyWageRate);
    const overtimeWages = Math.round(overtimeHours * labourer.hourlyWageRate * 1.5); // 1.5x overtime multiplier
    const pieceRateWages = Math.round((pieceUnitsCount || 0) * labourer.pieceRateWage);

    const grossWages = basicWages + overtimeWages + pieceRateWages;

    // Deduct approved advances not yet deducted
    const advances = Array.from(store.labourAdvances.values()).filter(
      (a) => a.labourerId === labourerId && a.status === "APPROVED"
    );
    const advancesDeducted = advances.reduce((acc, a) => acc + a.amount, 0);
    const netWagePayable = Math.max(0, grossWages - advancesDeducted);

    return {
      labourerId: labourer.id,
      labourerName: `${labourer.firstName} ${labourer.lastName}`,
      labourerCode: labourer.labourerCode,
      trade: labourer.primaryTrade,
      dailyWageRate: labourer.dailyWageRate,
      daysPresent,
      overtimeHours,
      overtimeRate: labourer.hourlyWageRate,
      basicWages,
      overtimeWages,
      pieceRateWages,
      grossWages,
      advancesDeducted,
      netWagePayable,
    };
  }

  // ----------------------------------------------------------------------------
  // CONTRACTOR MANAGEMENT
  // ----------------------------------------------------------------------------

  public async findContractorById(id: string): Promise<DbContractor | null> {
    const store = db.getStore();
    return store.contractors.get(id) || null;
  }

  public async generateNextContractorCode(companyId: string): Promise<string> {
    const store = db.getStore();
    let maxNum = 0;
    for (const c of store.contractors.values()) {
      if (c.companyId === companyId) {
        const match = c.contractorCode.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }
    const nextNum = (maxNum + 1).toString().padStart(2, "0");
    return `CONT-${nextNum}`;
  }

  public async findContractors(
    companyId: string,
    params: QueryContractorsParams
  ): Promise<{ data: DbContractor[]; total: number }> {
    const store = db.getStore();
    let list = Array.from(store.contractors.values()).filter((c) => c.companyId === companyId);

    if (params.contractorType) {
      list = list.filter((c) => c.contractorType === params.contractorType);
    }
    if (params.siteId) {
      list = list.filter((c) => c.allocatedSiteIds.includes(params.siteId!));
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.businessName.toLowerCase().includes(q) ||
          c.contractorCode.toLowerCase().includes(q) ||
          c.contactPerson.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = list.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    return { data: list.slice(offset, offset + limit), total };
  }

  public async createContractor(
    companyId: string,
    input: CreateContractorInput
  ): Promise<DbContractor> {
    const store = db.getStore();
    const now = new Date();
    const id = randomUUID();
    const contractorCode = await this.generateNextContractorCode(companyId);

    const contractor: DbContractor = {
      id,
      companyId,
      contractorCode,
      businessName: input.businessName.trim(),
      contractorType: input.contractorType,
      contactPerson: input.contactPerson.trim(),
      email: input.email?.trim() || null,
      phone: input.phone.trim(),
      taxId: input.taxId?.trim() || null,
      panNumber: input.panNumber?.trim() || null,
      address: input.address?.trim() || null,
      rating: input.rating ?? 5.0,
      contractValidFrom: new Date(input.contractValidFrom),
      contractValidTo: new Date(input.contractValidTo),
      contractRates: input.contractRates || { MASON: 850, GENERAL_HELPER: 550 },
      agreementDocUrl: null,
      allocatedProjectIds: input.allocatedProjectIds || [],
      allocatedSiteIds: input.allocatedSiteIds || [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    store.contractors.set(contractor.id, contractor);
    return contractor;
  }

  public async updateContractor(
    id: string,
    input: UpdateContractorInput
  ): Promise<DbContractor | null> {
    const store = db.getStore();
    const c = store.contractors.get(id);
    if (!c) return null;

    const now = new Date();
    if (input.businessName !== undefined) c.businessName = input.businessName.trim();
    if (input.contractorType !== undefined) c.contractorType = input.contractorType;
    if (input.contactPerson !== undefined) c.contactPerson = input.contactPerson.trim();
    if (input.phone !== undefined) c.phone = input.phone.trim();
    if (input.email !== undefined) c.email = input.email?.trim() || null;
    if (input.taxId !== undefined) c.taxId = input.taxId;
    if (input.rating !== undefined) c.rating = input.rating;
    if (input.contractValidTo !== undefined) c.contractValidTo = new Date(input.contractValidTo);
    if (input.contractRates !== undefined) c.contractRates = input.contractRates;
    if (input.allocatedSiteIds !== undefined) c.allocatedSiteIds = input.allocatedSiteIds;
    if (input.isActive !== undefined) c.isActive = input.isActive;

    c.updatedAt = now;
    return c;
  }

  public async submitContractorBill(
    companyId: string,
    input: SubmitContractorBillInput
  ): Promise<DbContractorBill> {
    const store = db.getStore();
    const now = new Date();
    const id = randomUUID();

    const netPayable = input.grossAmount - input.deductionsAmount;

    const bill: DbContractorBill = {
      id,
      companyId,
      contractorId: input.contractorId,
      billNumber: input.billNumber.trim(),
      projectId: input.projectId || null,
      siteId: input.siteId || null,
      periodStartDate: new Date(input.periodStartDate),
      periodEndDate: new Date(input.periodEndDate),
      mandaysCount: input.mandaysCount,
      grossAmount: input.grossAmount,
      deductionsAmount: input.deductionsAmount,
      netPayable,
      paidAmount: 0,
      status: "SUBMITTED",
      submittedDate: now,
      notes: input.notes || null,
      createdAt: now,
      updatedAt: now,
    };

    store.contractorBills.set(bill.id, bill);
    return bill;
  }

  public async reviewContractorBill(
    billId: string,
    decision: "APPROVED" | "REJECTED",
    userId: string,
    notes?: string
  ): Promise<DbContractorBill | null> {
    const store = db.getStore();
    const bill = store.contractorBills.get(billId);
    if (!bill) return null;

    bill.status = decision;
    bill.approvedByUserId = userId;
    bill.approvedAt = new Date();
    if (notes) bill.notes = notes;
    bill.updatedAt = new Date();
    return bill;
  }

  public async recordContractorPayment(
    companyId: string,
    input: RecordContractorPaymentInput
  ): Promise<DbContractorPayment> {
    return db.transaction(async (store) => {
      const now = new Date();
      const bill = store.contractorBills.get(input.billId);
      if (!bill) throw new Error("Contractor bill not found");

      const paymentId = randomUUID();
      const payment: DbContractorPayment = {
        id: paymentId,
        companyId,
        contractorId: bill.contractorId,
        billId: bill.id,
        amount: input.amount,
        paymentDate: new Date(input.paymentDate),
        paymentMode: input.paymentMode,
        referenceNumber: input.referenceNumber || null,
        notes: input.notes || null,
        createdAt: now,
      };

      store.contractorPayments.set(payment.id, payment);

      bill.paidAmount += input.amount;
      if (bill.paidAmount >= bill.netPayable) {
        bill.status = "PAID";
      } else if (bill.paidAmount > 0) {
        bill.status = "PARTIALLY_PAID";
      }
      bill.updatedAt = now;

      return payment;
    });
  }

  public async getContractorBills(contractorId: string): Promise<DbContractorBill[]> {
    const store = db.getStore();
    return Array.from(store.contractorBills.values())
      .filter((b) => b.contractorId === contractorId)
      .sort((a, b) => b.periodStartDate.getTime() - a.periodStartDate.getTime());
  }

  public async getContractorPayments(contractorId: string): Promise<DbContractorPayment[]> {
    const store = db.getStore();
    return Array.from(store.contractorPayments.values())
      .filter((p) => p.contractorId === contractorId)
      .sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime());
  }

  // ----------------------------------------------------------------------------
  // LEAVE & PORTAL SERVICES
  // ----------------------------------------------------------------------------

  public async getLeaveBalances(employeeId: string): Promise<DbLeaveBalance[]> {
    const store = db.getStore();
    return Array.from(store.leaveBalances.values()).filter((b) => b.employeeId === employeeId);
  }

  public async getLeaveRequests(employeeId: string): Promise<DbLeaveRequest[]> {
    const store = db.getStore();
    return Array.from(store.leaveRequests.values())
      .filter((r) => r.employeeId === employeeId)
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  }

  public async applyLeave(request: DbLeaveRequest): Promise<DbLeaveRequest> {
    const store = db.getStore();
    store.leaveRequests.set(request.id, request);
    return request;
  }

  public async getAnnouncements(companyId: string): Promise<DbCompanyAnnouncement[]> {
    const store = db.getStore();
    return Array.from(store.announcements.values())
      .filter((a) => a.companyId === companyId)
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  }

  // ----------------------------------------------------------------------------
  // WORKFORCE DASHBOARD AGGREGATOR
  // ----------------------------------------------------------------------------

  public async getWorkforceSummary(companyId: string): Promise<WorkforceDashboardSummary> {
    const store = db.getStore();
    const today = new Date().toISOString().slice(0, 10);

    const employees = Array.from(store.employees.values()).filter(
      (e) => e.companyId === companyId && e.status === "ACTIVE"
    );
    const permanentEmployees = employees.filter((e) => e.employmentType === "PERMANENT").length;
    const temporaryEmployees = employees.filter((e) => e.employmentType !== "PERMANENT").length;

    const labourers = Array.from(store.labourers.values()).filter(
      (l) => l.companyId === companyId && l.isActive
    );
    const activeContractors = Array.from(store.contractors.values()).filter(
      (c) => c.companyId === companyId && c.isActive
    ).length;

    // Site-wise breakdown
    const sites = Array.from(store.sites.values()).filter((s) => s.companyId === companyId);
    const siteWiseWorkforce = sites.map((site) => {
      const empCount = employees.filter((e) => e.assignedSiteId === site.id).length;
      const labCount = labourers.filter((l) => l.currentSiteId === site.id).length;
      return {
        siteId: site.id,
        siteName: site.name,
        siteCode: site.siteCode,
        employeesCount: empCount,
        labourersCount: labCount,
        totalWorkers: empCount + labCount,
      };
    });

    // Trade & Skill distributions
    const tradeMap = new Map<string, number>();
    const skillMap = new Map<string, number>();

    labourers.forEach((l) => {
      tradeMap.set(l.primaryTrade, (tradeMap.get(l.primaryTrade) || 0) + 1);
      skillMap.set(l.skillLevel, (skillMap.get(l.skillLevel) || 0) + 1);
    });

    const tradeDistribution = Array.from(tradeMap.entries()).map(([trade, count]) => ({
      trade,
      count,
    }));
    const skillDistribution = Array.from(skillMap.entries()).map(([skill, count]) => ({
      skill,
      count,
    }));

    // Today attendance counts
    const todaySessions = Array.from(store.attendanceSessions.values()).filter(
      (s) => s.companyId === companyId && s.sessionDate === today
    );
    const todayWorkersPresent = todaySessions.filter((s) => s.status === "PRESENT").length;
    const totalHeadcount = employees.length + labourers.length;
    const todayWorkersAbsent = Math.max(0, totalHeadcount - todayWorkersPresent);

    const availableWorkforce = labourers.filter((l) => l.availabilityStatus === "AVAILABLE").length;

    // Pending checks
    const pendingDocumentVerifications = Array.from(store.employeeDocuments.values()).filter(
      (d) => d.companyId === companyId && d.verificationStatus === "PENDING"
    ).length;

    const pendingAdvanceRequests = Array.from(store.labourAdvances.values()).filter(
      (a) => a.companyId === companyId && a.status === "PENDING"
    ).length;

    const pendingContractorBills = Array.from(store.contractorBills.values()).filter(
      (b) => b.companyId === companyId && b.status === "SUBMITTED"
    ).length;

    return {
      totalEmployees: employees.length,
      permanentEmployees,
      temporaryEmployees,
      totalLabourers: labourers.length,
      activeContractors,
      siteWiseWorkforce,
      tradeDistribution,
      skillDistribution,
      todayWorkersPresent,
      todayWorkersAbsent,
      availableWorkforce,
      pendingDocumentVerifications,
      pendingAdvanceRequests,
      pendingContractorBills,
    };
  }
}

export const workforceRepository = new WorkforceRepository();
