// ==============================================================================
// WORKFORCE SERVICE
// Business Logic for Employees, Daily Wage Labourers, Contractors & Portal
// ==============================================================================

import { randomUUID } from "node:crypto";
import type { SecurityContext } from "../../auth/context";
import { requireAuth, requirePermission, requireTenant } from "../../auth/guards";
import { BadRequestError, NotFoundError } from "../../core/errors/app-error";
import { createPaginationMeta, type PaginationMeta } from "../../core/response/pagination";
import { db } from "../../db/client";
import type {
  DbCompanyAnnouncement,
  DbContractor,
  DbContractorBill,
  DbContractorPayment,
  DbEmployee,
  DbEmployeeDocument,
  DbLabourTransfer,
  DbLabourWageAdvance,
  DbLabourer,
  DbLeaveBalance,
  DbLeaveRequest,
  DbSalaryStructure,
} from "../../db/types";
import { auditService } from "../audit/audit.service";
import { workforceRepository, type WorkforceRepository } from "./workforce.repository";
import type {
  ApplyLeaveInput,
  BulkImportWorkforceResult,
  ContractorWithSummary,
  CreateContractorInput,
  CreateEmployeeInput,
  CreateLabourerInput,
  EmployeeProfileFull,
  LabourWageCalculationResult,
  LabourerWithDetails,
  QueryContractorsParams,
  QueryEmployeesParams,
  QueryLabourersParams,
  RecordContractorPaymentInput,
  RequestAdvanceInput,
  ReviewAdvanceInput,
  ReviewContractorBillInput,
  ReviewLeaveInput,
  ReviewTransferInput,
  SubmitContractorBillInput,
  TransferWorkerInput,
  UpdateContractorInput,
  UpdateEmployeeInput,
  UpdateLabourerInput,
  WorkforceDashboardSummary,
} from "./workforce.types";

export class WorkforceService {
  private readonly repo: WorkforceRepository;

  constructor(repo: WorkforceRepository = workforceRepository) {
    this.repo = repo;
  }

  // ----------------------------------------------------------------------------
  // EMPLOYEE MANAGEMENT
  // ----------------------------------------------------------------------------

  public async getEmployee(id: string, ctx: SecurityContext): Promise<EmployeeProfileFull> {
    const employee = await this.repo.findEmployeeById(id);
    if (!employee) throw new NotFoundError("Employee", id);
    requireTenant(ctx, employee.companyId);

    // Allow employee to view their own profile, otherwise enforce View:employees permission
    if (ctx.user.id !== employee.userId) {
      requirePermission(ctx, "View", "employees");
    }

    const store = db.getStore();
    const dept = employee.departmentId ? store.departments.get(employee.departmentId) : undefined;
    const desig = employee.designationId ? store.designations.get(employee.designationId) : undefined;
    const sup = employee.reportingManagerId ? store.employees.get(employee.reportingManagerId) : undefined;
    const prj = employee.assignedProjectId ? store.projects.get(employee.assignedProjectId) : undefined;
    const site = employee.assignedSiteId ? store.sites.get(employee.assignedSiteId) : undefined;
    const sal = await this.repo.getSalaryStructure(employee.id);
    const docs = await this.repo.getEmployeeDocuments(employee.id);
    const history = await this.repo.getEmployeeHistory(employee.id);

    return {
      ...employee,
      departmentName: dept?.name,
      designationTitle: desig?.title,
      supervisorName: sup ? `${sup.firstName} ${sup.lastName}` : undefined,
      projectName: prj?.name,
      siteName: site?.name,
      salaryStructure: sal,
      documents: docs,
      history,
    };
  }

  public async listEmployees(
    ctx: SecurityContext,
    params: QueryEmployeesParams
  ): Promise<{ data: EmployeeProfileFull[]; meta: PaginationMeta }> {
    requirePermission(ctx, "View", "employees");

    const { data, total } = await this.repo.findEmployees(ctx.companyId, params);
    const store = db.getStore();

    const enriched: EmployeeProfileFull[] = await Promise.all(
      data.map(async (emp) => {
        const dept = emp.departmentId ? store.departments.get(emp.departmentId) : undefined;
        const desig = emp.designationId ? store.designations.get(emp.designationId) : undefined;
        const prj = emp.assignedProjectId ? store.projects.get(emp.assignedProjectId) : undefined;
        const site = emp.assignedSiteId ? store.sites.get(emp.assignedSiteId) : undefined;
        const sal = await this.repo.getSalaryStructure(emp.id);
        const docs = await this.repo.getEmployeeDocuments(emp.id);
        const history = await this.repo.getEmployeeHistory(emp.id);

        return {
          ...emp,
          departmentName: dept?.name,
          designationTitle: desig?.title,
          projectName: prj?.name,
          siteName: site?.name,
          salaryStructure: sal,
          documents: docs,
          history,
        };
      })
    );

    const meta = createPaginationMeta(params.page || 1, params.limit || 20, total);
    return { data: enriched, meta };
  }

  public async createEmployee(
    input: CreateEmployeeInput,
    ctx: SecurityContext
  ): Promise<DbEmployee> {
    requirePermission(ctx, "Create", "employees");
    requireTenant(ctx, ctx.companyId);

    if (!input.firstName?.trim() || !input.lastName?.trim()) {
      throw new BadRequestError("Employee first and last name are required");
    }
    if (!input.phone?.trim()) {
      throw new BadRequestError("Primary contact phone is required");
    }

    const employee = await this.repo.createEmployee(ctx.companyId, input, ctx.user.id);

    await auditService.logEvent({
      companyId: ctx.companyId,
      actorUserId: ctx.user.id,
      action: "CREATE_EMPLOYEE",
      tableName: "employees",
      recordId: employee.id,
      newData: {
        employeeCode: employee.employeeCode,
        fullName: `${employee.firstName} ${employee.lastName}`,
        departmentId: employee.departmentId,
        employmentType: employee.employmentType,
      },
    });

    return employee;
  }

  public async updateEmployee(
    id: string,
    input: UpdateEmployeeInput,
    ctx: SecurityContext
  ): Promise<DbEmployee> {
    requirePermission(ctx, "Update", "employees");

    const existing = await this.repo.findEmployeeById(id);
    if (!existing) throw new NotFoundError("Employee", id);
    requireTenant(ctx, existing.companyId);

    const updated = await this.repo.updateEmployee(id, input, ctx.user.id);
    if (!updated) throw new NotFoundError("Employee", id);

    await auditService.logEvent({
      companyId: existing.companyId,
      actorUserId: ctx.user.id,
      action: "UPDATE_EMPLOYEE",
      tableName: "employees",
      recordId: id,
      newData: input as unknown as Record<string, unknown>,
    });

    return updated;
  }

  public async addEmployeeDocument(
    employeeId: string,
    input: {
      documentType: any;
      title: string;
      fileName: string;
      fileUrl: string;
    },
    ctx: SecurityContext
  ): Promise<DbEmployeeDocument> {
    requirePermission(ctx, "Update", "employees");

    const emp = await this.repo.findEmployeeById(employeeId);
    if (!emp) throw new NotFoundError("Employee", employeeId);
    requireTenant(ctx, emp.companyId);

    const doc: DbEmployeeDocument = {
      id: randomUUID(),
      companyId: emp.companyId,
      employeeId,
      documentType: input.documentType,
      title: input.title,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      verificationStatus: "PENDING",
      createdAt: new Date(),
    };

    return this.repo.addEmployeeDocument(doc);
  }

  public async verifyEmployeeDocument(
    docId: string,
    status: "VERIFIED" | "REJECTED",
    rejectionReason: string | undefined,
    ctx: SecurityContext
  ): Promise<DbEmployeeDocument> {
    requirePermission(ctx, "Approve", "employees");

    const updated = await this.repo.verifyEmployeeDocument(
      docId,
      status,
      ctx.user.id,
      rejectionReason
    );
    if (!updated) throw new NotFoundError("EmployeeDocument", docId);

    await auditService.logEvent({
      companyId: updated.companyId,
      actorUserId: ctx.user.id,
      action: "VERIFY_EMPLOYEE_DOCUMENT",
      tableName: "employee_documents",
      recordId: docId,
      newData: { status, rejectionReason },
    });

    return updated;
  }

  public async bulkImportEmployees(
    csvContent: string,
    ctx: SecurityContext
  ): Promise<BulkImportWorkforceResult> {
    requirePermission(ctx, "Create", "employees");

    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length <= 1) {
      throw new BadRequestError("CSV file is empty or missing headers");
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const firstNameIdx = headers.indexOf("firstname");
    const lastNameIdx = headers.indexOf("lastname");
    const phoneIdx = headers.indexOf("phone");
    const emailIdx = headers.indexOf("email");
    const typeIdx = headers.indexOf("employmenttype");
    const joinDateIdx = headers.indexOf("joiningdate");

    if (firstNameIdx === -1 || lastNameIdx === -1 || phoneIdx === -1) {
      throw new BadRequestError("CSV must include columns: firstName, lastName, phone");
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: { row: number; identifier: string; reason: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const firstName = cols[firstNameIdx];
      const lastName = cols[lastNameIdx];
      const phone = cols[phoneIdx];

      if (!firstName || !lastName || !phone) {
        failedCount++;
        errors.push({
          row: i + 1,
          identifier: `${firstName || ""} ${lastName || ""}`.trim() || `Row ${i + 1}`,
          reason: "Missing mandatory fields (firstName, lastName, or phone)",
        });
        continue;
      }

      try {
        await this.createEmployee(
          {
            firstName,
            lastName,
            phone,
            email: emailIdx !== -1 ? cols[emailIdx] : undefined,
            employmentType: (typeIdx !== -1 && (cols[typeIdx] as any)) || "PERMANENT",
            joiningDate:
              joinDateIdx !== -1 && cols[joinDateIdx]
                ? cols[joinDateIdx]
                : new Date().toISOString().slice(0, 10),
          },
          ctx
        );
        successCount++;
      } catch (err: any) {
        failedCount++;
        errors.push({
          row: i + 1,
          identifier: `${firstName} ${lastName}`,
          reason: err.message,
        });
      }
    }

    return {
      totalProcessed: lines.length - 1,
      successCount,
      failedCount,
      errors,
    };
  }

  public async exportEmployeesCsv(ctx: SecurityContext): Promise<string> {
    requirePermission(ctx, "Export", "employees");

    const { data } = await this.repo.findEmployees(ctx.companyId, { limit: 1000 });
    const store = db.getStore();

    const headers = [
      "Employee Code",
      "Full Name",
      "Email",
      "Phone",
      "Department",
      "Designation",
      "Employment Type",
      "Status",
      "Joining Date",
      "Assigned Site",
    ];

    const rows = data.map((e) => {
      const dept = e.departmentId ? store.departments.get(e.departmentId)?.name : "";
      const desig = e.designationId ? store.designations.get(e.designationId)?.title : "";
      const site = e.assignedSiteId ? store.sites.get(e.assignedSiteId)?.name : "";

      return [
        `"${e.employeeCode}"`,
        `"${e.firstName} ${e.lastName}"`,
        `"${e.email || ""}"`,
        `"${e.phone}"`,
        `"${dept || ""}"`,
        `"${desig || ""}"`,
        `"${e.employmentType}"`,
        `"${e.status}"`,
        `"${new Date(e.joiningDate).toISOString().slice(0, 10)}"`,
        `"${site || ""}"`,
      ].join(",");
    });

    return [headers.join(","), ...rows].join("\n");
  }

  // ----------------------------------------------------------------------------
  // LABOUR MANAGEMENT
  // ----------------------------------------------------------------------------

  public async getLabourer(id: string, ctx: SecurityContext): Promise<LabourerWithDetails> {
    requirePermission(ctx, "View", "labourers");

    const lab = await this.repo.findLabourerById(id);
    if (!lab) throw new NotFoundError("Labourer", id);
    requireTenant(ctx, lab.companyId);

    const store = db.getStore();
    const cont = lab.contractorId ? store.contractors.get(lab.contractorId) : undefined;
    const site = lab.currentSiteId ? store.sites.get(lab.currentSiteId) : undefined;
    const prj = lab.currentProjectId ? store.projects.get(lab.currentProjectId) : undefined;
    const advances = await this.repo.getLabourAdvances(lab.id);

    const totalAdvancesAmount = advances
      .filter((a) => a.status === "APPROVED")
      .reduce((sum, a) => sum + a.amount, 0);

    return {
      ...lab,
      contractorName: cont?.businessName,
      siteName: site?.name,
      projectName: prj?.name,
      totalAdvancesAmount,
      pendingAdvancesCount: advances.filter((a) => a.status === "PENDING").length,
    };
  }

  public async listLabourers(
    ctx: SecurityContext,
    params: QueryLabourersParams
  ): Promise<{ data: LabourerWithDetails[]; meta: PaginationMeta }> {
    requirePermission(ctx, "View", "labourers");

    const { data, total } = await this.repo.findLabourers(ctx.companyId, params);
    const store = db.getStore();

    const enriched: LabourerWithDetails[] = await Promise.all(
      data.map(async (l) => {
        const cont = l.contractorId ? store.contractors.get(l.contractorId) : undefined;
        const site = l.currentSiteId ? store.sites.get(l.currentSiteId) : undefined;
        const prj = l.currentProjectId ? store.projects.get(l.currentProjectId) : undefined;
        const advances = await this.repo.getLabourAdvances(l.id);

        return {
          ...l,
          contractorName: cont?.businessName,
          siteName: site?.name,
          projectName: prj?.name,
          totalAdvancesAmount: advances
            .filter((a) => a.status === "APPROVED")
            .reduce((s, a) => s + a.amount, 0),
          pendingAdvancesCount: advances.filter((a) => a.status === "PENDING").length,
        };
      })
    );

    const meta = createPaginationMeta(params.page || 1, params.limit || 20, total);
    return { data: enriched, meta };
  }

  public async createLabourer(
    input: CreateLabourerInput,
    ctx: SecurityContext
  ): Promise<DbLabourer> {
    requirePermission(ctx, "Create", "labourers");
    requireTenant(ctx, ctx.companyId);

    if (!input.firstName?.trim() || !input.lastName?.trim()) {
      throw new BadRequestError("Labourer name is required");
    }
    if (!input.dailyWageRate || input.dailyWageRate <= 0) {
      throw new BadRequestError("Valid daily wage rate is required");
    }

    const labourer = await this.repo.createLabourer(ctx.companyId, input);

    await auditService.logEvent({
      companyId: ctx.companyId,
      actorUserId: ctx.user.id,
      action: "CREATE_LABOURER",
      tableName: "labourers",
      recordId: labourer.id,
      newData: {
        code: labourer.labourerCode,
        trade: labourer.primaryTrade,
        wage: labourer.dailyWageRate,
      },
    });

    return labourer;
  }

  public async updateLabourer(
    id: string,
    input: UpdateLabourerInput,
    ctx: SecurityContext
  ): Promise<DbLabourer> {
    requirePermission(ctx, "Update", "labourers");

    const existing = await this.repo.findLabourerById(id);
    if (!existing) throw new NotFoundError("Labourer", id);
    requireTenant(ctx, existing.companyId);

    const updated = await this.repo.updateLabourer(id, input);
    if (!updated) throw new NotFoundError("Labourer", id);

    await auditService.logEvent({
      companyId: existing.companyId,
      actorUserId: ctx.user.id,
      action: "UPDATE_LABOURER",
      tableName: "labourers",
      recordId: id,
      newData: input as unknown as Record<string, unknown>,
    });

    return updated;
  }

  public async calculateWage(
    labourerId: string,
    daysPresentCount: number | undefined,
    overtimeHours: number | undefined,
    pieceUnits: number | undefined,
    ctx: SecurityContext
  ): Promise<LabourWageCalculationResult> {
    requirePermission(ctx, "View", "payroll");

    const result = await this.repo.calculateLabourWage(
      ctx.companyId,
      labourerId,
      daysPresentCount,
      overtimeHours,
      pieceUnits
    );

    if (!result) throw new NotFoundError("Labourer", labourerId);
    return result;
  }

  public async requestAdvance(
    input: RequestAdvanceInput,
    ctx: SecurityContext
  ): Promise<DbLabourWageAdvance> {
    requirePermission(ctx, "Create", "payroll");

    const lab = await this.repo.findLabourerById(input.labourerId);
    if (!lab) throw new NotFoundError("Labourer", input.labourerId);
    requireTenant(ctx, lab.companyId);

    if (input.amount <= 0) {
      throw new BadRequestError("Advance amount must be greater than zero");
    }

    const advance: DbLabourWageAdvance = {
      id: randomUUID(),
      companyId: lab.companyId,
      labourerId: lab.id,
      amount: input.amount,
      requestDate: new Date(),
      reason: input.reason.trim(),
      status: "PENDING",
      createdAt: new Date(),
    };

    return this.repo.requestAdvance(advance);
  }

  public async reviewAdvance(
    input: ReviewAdvanceInput,
    ctx: SecurityContext
  ): Promise<DbLabourWageAdvance> {
    requirePermission(ctx, "Approve", "payroll");

    const updated = await this.repo.reviewAdvance(input.advanceId, input.decision, ctx.user.id);
    if (!updated) throw new NotFoundError("LabourWageAdvance", input.advanceId);

    await auditService.logEvent({
      companyId: updated.companyId,
      actorUserId: ctx.user.id,
      action: "REVIEW_LABOUR_ADVANCE",
      tableName: "labour_wage_advances",
      recordId: input.advanceId,
      newData: { decision: input.decision },
    });

    return updated;
  }

  public async transferWorker(
    input: TransferWorkerInput,
    ctx: SecurityContext
  ): Promise<DbLabourTransfer> {
    requirePermission(ctx, "Update", "labourers");

    const lab = await this.repo.findLabourerById(input.labourerId);
    if (!lab) throw new NotFoundError("Labourer", input.labourerId);
    requireTenant(ctx, lab.companyId);

    const store = db.getStore();
    const toSite = store.sites.get(input.toSiteId);
    if (!toSite || toSite.companyId !== ctx.companyId) {
      throw new NotFoundError("Site", input.toSiteId);
    }

    const transfer: DbLabourTransfer = {
      id: randomUUID(),
      companyId: lab.companyId,
      labourerId: lab.id,
      fromSiteId: lab.currentSiteId || toSite.id,
      toSiteId: input.toSiteId,
      transferDate: new Date(input.transferDate),
      reason: input.reason.trim(),
      status: "APPROVED", // Auto-approved by supervisor
      approvedByUserId: ctx.user.id,
      approvedAt: new Date(),
      createdAt: new Date(),
    };

    const saved = await this.repo.requestTransfer(transfer);
    const labEntity = store.labourers.get(lab.id);
    if (labEntity) {
      labEntity.currentSiteId = input.toSiteId;
    }
    return saved;
  }

  // ----------------------------------------------------------------------------
  // CONTRACTOR MANAGEMENT
  // ----------------------------------------------------------------------------

  public async getContractor(id: string, ctx: SecurityContext): Promise<ContractorWithSummary> {
    requirePermission(ctx, "View", "contractors");

    const cont = await this.repo.findContractorById(id);
    if (!cont) throw new NotFoundError("Contractor", id);
    requireTenant(ctx, cont.companyId);

    const store = db.getStore();
    const assignedLabourers = Array.from(store.labourers.values()).filter(
      (l) => l.contractorId === cont.id && l.isActive
    );

    const bills = await this.repo.getContractorBills(cont.id);
    const payments = await this.repo.getContractorPayments(cont.id);

    const totalBilledAmount = bills.reduce((sum, b) => sum + b.netPayable, 0);
    const totalPaidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const outstandingAmount = Math.max(0, totalBilledAmount - totalPaidAmount);

    return {
      ...cont,
      assignedLabourersCount: assignedLabourers.length,
      totalBilledAmount,
      totalPaidAmount,
      outstandingAmount,
      bills,
      payments,
    };
  }

  public async listContractors(
    ctx: SecurityContext,
    params: QueryContractorsParams
  ): Promise<{ data: ContractorWithSummary[]; meta: PaginationMeta }> {
    requirePermission(ctx, "View", "contractors");

    const { data, total } = await this.repo.findContractors(ctx.companyId, params);
    const store = db.getStore();

    const enriched: ContractorWithSummary[] = await Promise.all(
      data.map(async (c) => {
        const assignedLabourers = Array.from(store.labourers.values()).filter(
          (l) => l.contractorId === c.id && l.isActive
        );
        const bills = await this.repo.getContractorBills(c.id);
        const payments = await this.repo.getContractorPayments(c.id);

        const totalBilled = bills.reduce((s, b) => s + b.netPayable, 0);
        const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

        return {
          ...c,
          assignedLabourersCount: assignedLabourers.length,
          totalBilledAmount: totalBilled,
          totalPaidAmount: totalPaid,
          outstandingAmount: Math.max(0, totalBilled - totalPaid),
          bills,
          payments,
        };
      })
    );

    const meta = createPaginationMeta(params.page || 1, params.limit || 20, total);
    return { data: enriched, meta };
  }

  public async createContractor(
    input: CreateContractorInput,
    ctx: SecurityContext
  ): Promise<DbContractor> {
    requirePermission(ctx, "Create", "contractors");
    requireTenant(ctx, ctx.companyId);

    if (!input.businessName?.trim()) {
      throw new BadRequestError("Contractor business name is required");
    }

    const contractor = await this.repo.createContractor(ctx.companyId, input);

    await auditService.logEvent({
      companyId: ctx.companyId,
      actorUserId: ctx.user.id,
      action: "CREATE_CONTRACTOR",
      tableName: "contractors",
      recordId: contractor.id,
      newData: {
        code: contractor.contractorCode,
        name: contractor.businessName,
        type: contractor.contractorType,
      },
    });

    return contractor;
  }

  public async updateContractor(
    id: string,
    input: UpdateContractorInput,
    ctx: SecurityContext
  ): Promise<DbContractor> {
    requirePermission(ctx, "Update", "contractors");

    const existing = await this.repo.findContractorById(id);
    if (!existing) throw new NotFoundError("Contractor", id);
    requireTenant(ctx, existing.companyId);

    const updated = await this.repo.updateContractor(id, input);
    if (!updated) throw new NotFoundError("Contractor", id);

    await auditService.logEvent({
      companyId: existing.companyId,
      actorUserId: ctx.user.id,
      action: "UPDATE_CONTRACTOR",
      tableName: "contractors",
      recordId: id,
      newData: input as unknown as Record<string, unknown>,
    });

    return updated;
  }

  public async submitContractorBill(
    input: SubmitContractorBillInput,
    ctx: SecurityContext
  ): Promise<DbContractorBill> {
    requirePermission(ctx, "Create", "finance");

    const cont = await this.repo.findContractorById(input.contractorId);
    if (!cont) throw new NotFoundError("Contractor", input.contractorId);
    requireTenant(ctx, cont.companyId);

    const bill = await this.repo.submitContractorBill(cont.companyId, input);

    await auditService.logEvent({
      companyId: cont.companyId,
      actorUserId: ctx.user.id,
      action: "SUBMIT_CONTRACTOR_BILL",
      tableName: "contractor_bills",
      recordId: bill.id,
      newData: { billNumber: bill.billNumber, netPayable: bill.netPayable },
    });

    return bill;
  }

  public async reviewContractorBill(
    input: ReviewContractorBillInput,
    ctx: SecurityContext
  ): Promise<DbContractorBill> {
    requirePermission(ctx, "Approve", "finance");

    const updated = await this.repo.reviewContractorBill(
      input.billId,
      input.decision,
      ctx.user.id,
      input.notes
    );
    if (!updated) throw new NotFoundError("ContractorBill", input.billId);

    await auditService.logEvent({
      companyId: updated.companyId,
      actorUserId: ctx.user.id,
      action: "REVIEW_CONTRACTOR_BILL",
      tableName: "contractor_bills",
      recordId: input.billId,
      newData: { decision: input.decision },
    });

    return updated;
  }

  public async recordContractorPayment(
    input: RecordContractorPaymentInput,
    ctx: SecurityContext
  ): Promise<DbContractorPayment> {
    requirePermission(ctx, "Create", "finance");

    const payment = await this.repo.recordContractorPayment(ctx.companyId, input);

    await auditService.logEvent({
      companyId: ctx.companyId,
      actorUserId: ctx.user.id,
      action: "RECORD_CONTRACTOR_PAYMENT",
      tableName: "contractor_payments",
      recordId: payment.id,
      newData: { amount: payment.amount, billId: payment.billId },
    });

    return payment;
  }

  // ----------------------------------------------------------------------------
  // WORKFORCE DASHBOARD AGGREGATOR
  // ----------------------------------------------------------------------------

  public async getDashboardSummary(ctx: SecurityContext): Promise<WorkforceDashboardSummary> {
    requireAuth(ctx);
    return this.repo.getWorkforceSummary(ctx.companyId);
  }

  // ----------------------------------------------------------------------------
  // EMPLOYEE SELF-SERVICE PORTAL
  // ----------------------------------------------------------------------------

  public async getMyProfile(ctx: SecurityContext): Promise<EmployeeProfileFull> {
    requireAuth(ctx);
    const store = db.getStore();

    const emp = Array.from(store.employees.values()).find(
      (e) => e.userId === ctx.user.id && e.companyId === ctx.companyId
    );

    if (!emp) {
      throw new NotFoundError("Employee profile not found for authenticated user");
    }

    return this.getEmployee(emp.id, ctx);
  }

  public async getMySalary(ctx: SecurityContext): Promise<{
    salaryStructure: DbSalaryStructure | null;
    grossSalary: number;
    totalDeductions: number;
    netTakeHome: number;
  }> {
    requireAuth(ctx);
    const profile = await this.getMyProfile(ctx);
    const sal = profile.salaryStructure;

    if (!sal) {
      return {
        salaryStructure: null,
        grossSalary: 0,
        totalDeductions: 0,
        netTakeHome: 0,
      };
    }

    const grossSalary =
      sal.baseSalary +
      sal.hra +
      sal.conveyanceAllowance +
      sal.siteAllowance +
      sal.specialAllowance;

    const pfAmount = Math.round((sal.baseSalary * sal.pfEmployeePercent) / 100);
    const esiAmount = Math.round((grossSalary * sal.esiEmployeePercent) / 100);
    const totalDeductions = pfAmount + esiAmount + sal.professionalTax;
    const netTakeHome = grossSalary - totalDeductions;

    return {
      salaryStructure: sal,
      grossSalary,
      totalDeductions,
      netTakeHome,
    };
  }

  public async getMyLeaves(ctx: SecurityContext): Promise<{
    balances: (DbLeaveBalance & { leaveTypeName: string })[];
    requests: (DbLeaveRequest & { leaveTypeName: string })[];
  }> {
    requireAuth(ctx);
    const profile = await this.getMyProfile(ctx);
    const store = db.getStore();

    const balances = (await this.repo.getLeaveBalances(profile.id)).map((b) => ({
      ...b,
      leaveTypeName: store.leaveTypes.get(b.leaveTypeId)?.name || "Leave",
    }));

    const requests = (await this.repo.getLeaveRequests(profile.id)).map((r) => ({
      ...r,
      leaveTypeName: store.leaveTypes.get(r.leaveTypeId)?.name || "Leave",
    }));

    return { balances, requests };
  }

  public async applyLeave(
    input: ApplyLeaveInput,
    ctx: SecurityContext
  ): Promise<DbLeaveRequest> {
    requireAuth(ctx);
    const profile = await this.getMyProfile(ctx);

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    const daysCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

    const request: DbLeaveRequest = {
      id: randomUUID(),
      companyId: ctx.companyId,
      employeeId: profile.id,
      leaveTypeId: input.leaveTypeId,
      startDate: start,
      endDate: end,
      daysCount,
      reason: input.reason.trim(),
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.repo.applyLeave(request);
  }

  public async getAnnouncements(ctx: SecurityContext): Promise<DbCompanyAnnouncement[]> {
    requireAuth(ctx);
    return this.repo.getAnnouncements(ctx.companyId);
  }
}

export const workforceService = new WorkforceService();
