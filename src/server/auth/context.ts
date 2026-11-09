// ==============================================================================
// CONSTRUCT360 SECURITY CONTEXT & TENANT RESOLUTION
// Extracts, Verifies & Hydrates User, Active Tenant & Effective RBAC Permissions
// ==============================================================================

import type { NextRequest } from "next/server";
import { UnauthorizedError, TenantAccessDeniedError, ForbiddenError } from "../core/errors/app-error";
import { ErrorCodes } from "../core/errors/error-codes";
import { SESSION_COOKIE_NAME, verifySessionToken } from "../core/security/tokens";
import { db } from "../db/client";
import type { DbRole, DbUser, DbUserSession } from "../db/types";

export interface UserRoleAssignment {
  roleId: string;
  roleSlug: string;
  roleName: string;
  projectId?: string | null;
}

export interface SecurityContext {
  user: DbUser;
  session: DbUserSession;
  companyId: string;
  isSuperAdmin: boolean;
  roles: UserRoleAssignment[];
  permissions: Set<string>; // e.g. "companies:view", "attendance:approve"
}

export async function resolveSecurityContext(req: NextRequest): Promise<SecurityContext> {
  const store = db.getStore();

  // 1. Extract session token from HTTP-only cookie or Authorization Bearer header
  const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  const rawToken = cookieToken || bearerToken;
  if (!rawToken) {
    throw new UnauthorizedError("Authentication required: No session provided", ErrorCodes.UNAUTHORIZED);
  }

  // 2. Verify Cryptographic Token Signature
  const sessionId = verifySessionToken(rawToken);
  if (!sessionId) {
    throw new UnauthorizedError("Invalid session signature or malformed token", ErrorCodes.INVALID_TOKEN);
  }

  // 3. Locate Session in Store
  const session = store.sessions.get(sessionId);
  if (!session) {
    throw new UnauthorizedError("Session not found or previously terminated", ErrorCodes.SESSION_EXPIRED);
  }

  if (session.revokedAt) {
    throw new UnauthorizedError("Session has been revoked", ErrorCodes.SESSION_REVOKED);
  }

  if (session.expiresAt.getTime() < Date.now()) {
    throw new UnauthorizedError("Session expired", ErrorCodes.SESSION_EXPIRED);
  }

  // 4. Hydrate User Record
  const user = store.users.get(session.userId);
  if (!user || !user.isActive) {
    throw new UnauthorizedError("User account is inactive or decommissioned", ErrorCodes.ACCOUNT_INACTIVE);
  }

  // 5. Determine Active Tenant (Company Context)
  // Check explicit tenant header 'x-company-id', fallback to user's default company membership
  const requestedCompanyId = req.headers.get("x-company-id");

  const userMemberships = Array.from(store.memberships.values()).filter(
    (m) => m.userId === user.id && m.isActive
  );

  if (userMemberships.length === 0) {
    throw new ForbiddenError("User is not affiliated with any active organization", ErrorCodes.TENANT_ACCESS_DENIED);
  }

  let activeCompanyId: string;
  if (requestedCompanyId) {
    const hasMembership = userMemberships.some((m) => m.companyId === requestedCompanyId);
    // SuperAdmin can access any active company
    const isGlobalSuperAdmin = Array.from(store.userRoles.values()).some(
      (ur) => ur.userId === user.id && store.roles.get(ur.roleId)?.slug === "super_admin"
    );

    if (!hasMembership && !isGlobalSuperAdmin) {
      throw new TenantAccessDeniedError(requestedCompanyId);
    }
    activeCompanyId = requestedCompanyId;
  } else {
    // Pick default membership or first active membership
    const defaultM = userMemberships.find((m) => m.isDefault) || userMemberships[0];
    activeCompanyId = defaultM.companyId;
  }

  // 6. Compute Effective Roles & Permissions for the Active Company
  const assignedUserRoles = Array.from(store.userRoles.values()).filter(
    (ur) => ur.userId === user.id && (ur.companyId === activeCompanyId || !ur.companyId)
  );

  const roles: UserRoleAssignment[] = [];
  const permissions = new Set<string>();
  let isSuperAdmin = false;

  for (const ur of assignedUserRoles) {
    const role = store.roles.get(ur.roleId);
    if (!role) continue;

    if (role.slug === "super_admin") {
      isSuperAdmin = true;
    }

    roles.push({
      roleId: role.id,
      roleSlug: role.slug,
      roleName: role.name,
      projectId: ur.projectId,
    });

    // Hydrate permissions mapped to this role
    for (const rp of store.rolePermissions.values()) {
      if (rp.roleId === role.id) {
        const perm = store.permissions.get(rp.permissionId);
        if (perm) {
          permissions.add(perm.code.toLowerCase());
          // Project-scoped permission token if assigned to a specific project
          if (ur.projectId) {
            permissions.add(`${perm.code.toLowerCase()}#project:${ur.projectId}`);
          }
        }
      }
    }
  }

  return {
    user,
    session,
    companyId: activeCompanyId,
    isSuperAdmin,
    roles,
    permissions,
  };
}
