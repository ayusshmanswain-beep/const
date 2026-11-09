// ==============================================================================
// CONSTRUCT360 RBAC & TENANT ACCESS GUARDS
// Server-Side Authorization Invariant Enforcers
// ==============================================================================

import { ForbiddenError, PermissionDeniedError, TenantAccessDeniedError } from "../core/errors/app-error";
import type { SecurityContext } from "./context";

export type PermissionAction = "View" | "Create" | "Update" | "Delete" | "Approve" | "Export" | "Manage";

export function requireAuth(ctx: SecurityContext): void {
  if (!ctx.user || !ctx.session) {
    throw new ForbiddenError("Unauthenticated request");
  }
}

export function requireTenant(ctx: SecurityContext, targetCompanyId: string): void {
  if (ctx.isSuperAdmin) return;

  if (ctx.companyId !== targetCompanyId) {
    throw new TenantAccessDeniedError(targetCompanyId);
  }
}

export function requireRole(ctx: SecurityContext, allowedRoleSlugs: string[]): void {
  if (ctx.isSuperAdmin) return;

  const hasRole = ctx.roles.some((r) => allowedRoleSlugs.includes(r.roleSlug));
  if (!hasRole) {
    throw new ForbiddenError(`Operation requires one of roles: [${allowedRoleSlugs.join(", ")}]`);
  }
}

export function requirePermission(
  ctx: SecurityContext,
  action: PermissionAction,
  resource: string,
  scope?: { projectId?: string }
): void {
  if (ctx.isSuperAdmin) return;

  const normalizedAction = action.toLowerCase();
  const normalizedResource = resource.toLowerCase();

  const exactPerm = `${normalizedResource}:${normalizedAction}`;
  const managePerm = `${normalizedResource}:manage`;

  // Company-wide permissions check
  if (ctx.permissions.has(exactPerm) || ctx.permissions.has(managePerm)) {
    return;
  }

  // Project-scoped permissions check if projectId is provided
  if (scope?.projectId) {
    const projectExactPerm = `${exactPerm}#project:${scope.projectId}`;
    const projectManagePerm = `${managePerm}#project:${scope.projectId}`;

    if (ctx.permissions.has(projectExactPerm) || ctx.permissions.has(projectManagePerm)) {
      return;
    }
  }

  throw new PermissionDeniedError(action, resource);
}

export function requireProjectAccess(ctx: SecurityContext, projectId: string): void {
  if (ctx.isSuperAdmin) return;

  // If user has company-wide role (no projectId constraint)
  const hasCompanyWideRole = ctx.roles.some((r) => !r.projectId);
  if (hasCompanyWideRole) return;

  // Otherwise check if explicitly assigned to this project
  const hasProjectRole = ctx.roles.some((r) => r.projectId === projectId);
  if (!hasProjectRole) {
    throw new ForbiddenError(`Access denied to project '${projectId}'`);
  }
}
