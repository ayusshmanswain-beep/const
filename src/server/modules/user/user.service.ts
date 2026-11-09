// ==============================================================================
// USER SERVICE
// Team Identity, Lifecycle, Access Status & Role Delegation
// ==============================================================================

import type { SecurityContext } from "../../auth/context";
import { requirePermission, requireTenant } from "../../auth/guards";
import { BadRequestError, NotFoundError } from "../../core/errors/app-error";
import { createPaginationMeta, type PaginationMeta } from "../../core/response/pagination";
import { generateRandomToken, hashOpaqueToken } from "../../core/security/tokens";
import type { DbUser } from "../../db/types";
import { auditService } from "../audit/audit.service";
import { userRepository, type UserRepository, type UserWithRolesSummary } from "./user.repository";
import type { AssignRolesInput, InviteUserInput, QueryUsersParams, UpdateUserInput } from "./user.types";

export class UserService {
  private readonly repo: UserRepository;

  constructor(repo: UserRepository = userRepository) {
    this.repo = repo;
  }

  public async listUsers(
    companyId: string,
    params: QueryUsersParams,
    ctx: SecurityContext
  ): Promise<{ data: UserWithRolesSummary[]; meta: PaginationMeta }> {
    requireTenant(ctx, companyId);
    requirePermission(ctx, "View", "users");

    const { data, total } = await this.repo.findManyByCompany(companyId, params);
    const meta = createPaginationMeta(params.page, params.limit, total);
    return { data, meta };
  }

  public async getUser(id: string, companyId: string, ctx: SecurityContext): Promise<DbUser> {
    requireTenant(ctx, companyId);
    requirePermission(ctx, "View", "users");

    const user = await this.repo.findById(id);
    if (!user) {
      throw new NotFoundError("User", id);
    }
    return user;
  }

  public async inviteUser(
    companyId: string,
    input: InviteUserInput,
    ctx: SecurityContext
  ): Promise<{ message: string; invitationToken?: string }> {
    requireTenant(ctx, companyId);
    requirePermission(ctx, "Create", "users");

    const rawToken = generateRandomToken(32);
    const tokenHash = hashOpaqueToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.repo.createInvitation(
      input.email,
      companyId,
      input.roleId,
      tokenHash,
      ctx.user.id,
      expiresAt
    );

    await auditService.logEvent({
      companyId,
      actorUserId: ctx.user.id,
      action: "INVITE_USER",
      tableName: "users",
      recordId: invitation.id,
      newData: { email: input.email, roleId: input.roleId },
    });

    return {
      message: `Invitation dispatched to ${input.email}`,
      invitationToken: process.env.NODE_ENV !== "production" ? rawToken : undefined,
    };
  }

  public async updateUser(
    id: string,
    companyId: string,
    input: UpdateUserInput,
    ctx: SecurityContext
  ): Promise<DbUser> {
    requireTenant(ctx, companyId);
    requirePermission(ctx, "Update", "users");

    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError("User", id);
    }

    const updated = await this.repo.update(id, input);

    await auditService.logEvent({
      companyId,
      actorUserId: ctx.user.id,
      action: "UPDATE_USER",
      tableName: "users",
      recordId: id,
      oldData: existing as unknown as Record<string, unknown>,
      newData: updated as unknown as Record<string, unknown>,
    });

    return updated!;
  }

  public async toggleStatus(
    id: string,
    companyId: string,
    isActive: boolean,
    ctx: SecurityContext
  ): Promise<DbUser> {
    requireTenant(ctx, companyId);
    requirePermission(ctx, "Manage", "users");

    if (id === ctx.user.id && !isActive) {
      throw new BadRequestError("Administrators cannot deactivate their own active account");
    }

    const updated = await this.repo.setStatus(id, isActive);
    if (!updated) {
      throw new NotFoundError("User", id);
    }

    await auditService.logEvent({
      companyId,
      actorUserId: ctx.user.id,
      action: isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
      tableName: "users",
      recordId: id,
      newData: { isActive },
    });

    return updated;
  }

  public async assignRoles(
    id: string,
    companyId: string,
    input: AssignRolesInput,
    ctx: SecurityContext
  ): Promise<{ success: boolean }> {
    requireTenant(ctx, companyId);
    requirePermission(ctx, "Manage", "roles");

    await this.repo.assignRoles(id, companyId, input.roleIds, input.projectId);

    await auditService.logEvent({
      companyId,
      actorUserId: ctx.user.id,
      action: "ASSIGN_USER_ROLES",
      tableName: "user_roles",
      recordId: id,
      newData: { roleIds: input.roleIds, projectId: input.projectId },
    });

    return { success: true };
  }
}

export const userService = new UserService();
