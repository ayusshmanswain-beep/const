// ==============================================================================
// ROLE SERVICE
// Tenant Role Management & Authority Delegation
// ==============================================================================

import type { SecurityContext } from "../../auth/context";
import { requirePermission, requireTenant } from "../../auth/guards";
import { BadRequestError, NotFoundError } from "../../core/errors/app-error";
import type { DbRole } from "../../db/types";
import { auditService } from "../audit/audit.service";
import { roleRepository, type RoleRepository, type RoleWithPermissions } from "./role.repository";
import type { AssignPermissionsInput, CreateRoleInput, UpdateRoleInput } from "./role.types";

export class RoleService {
  private readonly repo: RoleRepository;

  constructor(repo: RoleRepository = roleRepository) {
    this.repo = repo;
  }

  public async listRoles(companyId: string, ctx: SecurityContext): Promise<RoleWithPermissions[]> {
    requireTenant(ctx, companyId);
    requirePermission(ctx, "View", "roles");
    return this.repo.findManyByCompany(companyId);
  }

  public async getRole(id: string, companyId: string, ctx: SecurityContext): Promise<DbRole> {
    requireTenant(ctx, companyId);
    requirePermission(ctx, "View", "roles");

    const role = await this.repo.findById(id);
    if (!role) throw new NotFoundError("Role", id);
    return role;
  }

  public async createRole(companyId: string, input: CreateRoleInput, ctx: SecurityContext): Promise<DbRole> {
    requireTenant(ctx, companyId);
    requirePermission(ctx, "Create", "roles");

    const role = await this.repo.create(companyId, input);

    await auditService.logEvent({
      companyId,
      actorUserId: ctx.user.id,
      action: "CREATE_ROLE",
      tableName: "roles",
      recordId: role.id,
      newData: role as unknown as Record<string, unknown>,
    });

    return role;
  }

  public async updateRole(
    id: string,
    companyId: string,
    input: UpdateRoleInput,
    ctx: SecurityContext
  ): Promise<DbRole> {
    requireTenant(ctx, companyId);
    requirePermission(ctx, "Update", "roles");

    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError("Role", id);

    if (existing.isSystemRole) {
      throw new BadRequestError("System baseline roles cannot be modified");
    }

    const updated = await this.repo.update(id, input);

    await auditService.logEvent({
      companyId,
      actorUserId: ctx.user.id,
      action: "UPDATE_ROLE",
      tableName: "roles",
      recordId: id,
      newData: updated as unknown as Record<string, unknown>,
    });

    return updated!;
  }

  public async assignPermissions(
    roleId: string,
    companyId: string,
    input: AssignPermissionsInput,
    ctx: SecurityContext
  ): Promise<{ success: boolean }> {
    requireTenant(ctx, companyId);
    requirePermission(ctx, "Manage", "roles");

    const role = await this.repo.findById(roleId);
    if (!role) throw new NotFoundError("Role", roleId);

    if (role.isSystemRole && !ctx.isSuperAdmin) {
      throw new BadRequestError("System baseline roles can only be adjusted by system administrators");
    }

    await this.repo.setPermissions(roleId, input.permissionIds);

    await auditService.logEvent({
      companyId,
      actorUserId: ctx.user.id,
      action: "ASSIGN_ROLE_PERMISSIONS",
      tableName: "role_permissions",
      recordId: roleId,
      newData: { permissionIds: input.permissionIds },
    });

    return { success: true };
  }
}

export const roleService = new RoleService();
