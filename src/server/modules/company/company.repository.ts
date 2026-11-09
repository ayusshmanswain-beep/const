// ==============================================================================
// COMPANY REPOSITORY
// Organizations & Branch Regional Offices Data Access
// ==============================================================================

import { randomUUID } from "node:crypto";
import { db } from "../../db/client";
import type { DbBranch, DbCompany } from "../../db/types";
import type { CreateBranchInput, QueryCompaniesParams, UpdateCompanyInput } from "./company.types";

export class CompanyRepository {
  public async findById(id: string): Promise<DbCompany | null> {
    const store = db.getStore();
    return store.companies.get(id) || null;
  }

  public async findByCode(code: string): Promise<DbCompany | null> {
    const store = db.getStore();
    for (const c of store.companies.values()) {
      if (c.code.toLowerCase() === code.toLowerCase()) {
        return c;
      }
    }
    return null;
  }

  public async findUserCompanies(
    userId: string,
    isSuperAdmin: boolean,
    params: QueryCompaniesParams
  ): Promise<{ data: DbCompany[]; total: number }> {
    const store = db.getStore();

    let list = Array.from(store.companies.values()).filter((c) => c.isActive);

    if (!isSuperAdmin) {
      const userCompanyIds = new Set(
        Array.from(store.memberships.values())
          .filter((m) => m.userId === userId && m.isActive)
          .map((m) => m.companyId)
      );
      list = list.filter((c) => userCompanyIds.has(c.id));
    }

    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter((c) => c.legalName.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
    }

    const total = list.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const data = list.slice(offset, offset + limit);
    return { data, total };
  }

  public async update(id: string, input: UpdateCompanyInput): Promise<DbCompany | null> {
    const store = db.getStore();
    const company = store.companies.get(id);
    if (!company) return null;

    if (input.legalName !== undefined) company.legalName = input.legalName;
    if (input.tradeName !== undefined) company.tradeName = input.tradeName;
    if (input.taxId !== undefined) company.taxId = input.taxId;
    if (input.phone !== undefined) company.phone = input.phone;
    if (input.website !== undefined) company.website = input.website;
    if (input.timezone !== undefined) company.timezone = input.timezone;
    if (input.settings !== undefined) company.settings = { ...company.settings, ...input.settings };

    company.updatedAt = new Date();
    store.companies.set(id, company);
    return company;
  }

  public async createBranch(companyId: string, input: CreateBranchInput): Promise<DbBranch> {
    const store = db.getStore();
    const branch: DbBranch = {
      id: randomUUID(),
      companyId,
      code: input.code,
      name: input.name,
      email: input.email,
      phone: input.phone,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      state: input.state,
      country: input.country || "India",
      postalCode: input.postalCode,
      isHeadquarters: input.isHeadquarters || false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    store.branches.set(branch.id, branch);
    return branch;
  }

  public async findBranchesByCompany(companyId: string): Promise<DbBranch[]> {
    const store = db.getStore();
    return Array.from(store.branches.values()).filter((b) => b.companyId === companyId && b.isActive);
  }
}

export const companyRepository = new CompanyRepository();
