// ==============================================================================
// COMPANY SERVICE
// Multi-Tenant Isolation & Branch Hierarchy Management
// ==============================================================================

import type { SecurityContext } from "../../auth/context";
import { requirePermission, requireTenant } from "../../auth/guards";
import { NotFoundError } from "../../core/errors/app-error";
import { createPaginationMeta, type PaginationMeta } from "../../core/response/pagination";
import type { DbBranch, DbCompany } from "../../db/types";
import { auditService } from "../audit/audit.service";
import { companyRepository, type CompanyRepository } from "./company.repository";
import type { CreateBranchInput, QueryCompaniesParams, UpdateCompanyInput } from "./company.types";

export class CompanyService {
  private readonly repo: CompanyRepository;

  constructor(repo: CompanyRepository = companyRepository) {
    this.repo = repo;
  }

  public async getCompany(id: string, ctx: SecurityContext): Promise<DbCompany> {
    requireTenant(ctx, id);
    requirePermission(ctx, "View", "companies");

    const company = await this.repo.findById(id);
    if (!company) {
      throw new NotFoundError("Company", id);
    }
    return company;
  }

  public async listCompanies(
    ctx: SecurityContext,
    params: QueryCompaniesParams
  ): Promise<{ data: DbCompany[]; meta: PaginationMeta }> {
    requirePermission(ctx, "View", "companies");

    const { data, total } = await this.repo.findUserCompanies(ctx.user.id, ctx.isSuperAdmin, params);
    const meta = createPaginationMeta(params.page, params.limit, total);
    return { data, meta };
  }

  public async updateCompany(id: string, input: UpdateCompanyInput, ctx: SecurityContext): Promise<DbCompany> {
    requireTenant(ctx, id);
    requirePermission(ctx, "Update", "companies");

    const oldCompany = await this.repo.findById(id);
    if (!oldCompany) {
      throw new NotFoundError("Company", id);
    }

    const updated = await this.repo.update(id, input);

    await auditService.logEvent({
      companyId: id,
      actorUserId: ctx.user.id,
      action: "UPDATE_COMPANY",
      tableName: "companies",
      recordId: id,
      oldData: oldCompany as unknown as Record<string, unknown>,
      newData: updated as unknown as Record<string, unknown>,
    });

    return updated!;
  }

  public async createBranch(companyId: string, input: CreateBranchInput, ctx: SecurityContext): Promise<DbBranch> {
    requireTenant(ctx, companyId);
    requirePermission(ctx, "Create", "branches");

    const branch = await this.repo.createBranch(companyId, input);

    await auditService.logEvent({
      companyId,
      actorUserId: ctx.user.id,
      action: "CREATE_BRANCH",
      tableName: "branches",
      recordId: branch.id,
      newData: branch as unknown as Record<string, unknown>,
    });

    return branch;
  }

  public async listBranches(companyId: string, ctx: SecurityContext): Promise<DbBranch[]> {
    requireTenant(ctx, companyId);
    requirePermission(ctx, "View", "branches");
    return this.repo.findBranchesByCompany(companyId);
  }
}

export const companyService = new CompanyService();
