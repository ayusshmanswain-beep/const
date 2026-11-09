// ==============================================================================
// PERMISSION SERVICE
// Catalog Enumeration & Effective RBAC Evaluation
// ==============================================================================

import type { SecurityContext } from "../../auth/context";
import { requirePermission } from "../../auth/guards";
import type { DbPermission } from "../../db/types";
import { permissionRepository, type PermissionRepository } from "./permission.repository";

export class PermissionService {
  private readonly repo: PermissionRepository;

  constructor(repo: PermissionRepository = permissionRepository) {
    this.repo = repo;
  }

  public async listPermissions(ctx: SecurityContext): Promise<DbPermission[]> {
    requirePermission(ctx, "View", "permissions");
    return this.repo.findAll();
  }

  public async getMyPermissions(ctx: SecurityContext, projectId?: string): Promise<string[]> {
    const perms = await this.repo.findUserPermissions(ctx.user.id, ctx.companyId, projectId);
    return perms.map((p) => p.code);
  }
}

export const permissionService = new PermissionService();
