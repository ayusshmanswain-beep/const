// ==============================================================================
// PERMISSION REPOSITORY
// Global Fine-Grained Permissions Catalog Access
// ==============================================================================

import { db } from "../../db/client";
import type { DbPermission } from "../../db/types";

export class PermissionRepository {
  public async findAll(): Promise<DbPermission[]> {
    const store = db.getStore();
    return Array.from(store.permissions.values());
  }

  public async findByIds(ids: string[]): Promise<DbPermission[]> {
    const store = db.getStore();
    return ids.map((id) => store.permissions.get(id)).filter((p): p is DbPermission => Boolean(p));
  }

  public async findUserPermissions(
    userId: string,
    companyId: string,
    projectId?: string
  ): Promise<DbPermission[]> {
    const store = db.getStore();

    // 1. Find user role assignments for target company
    const userRoles = Array.from(store.userRoles.values()).filter(
      (ur) => ur.userId === userId && (ur.companyId === companyId || !ur.companyId)
    );

    // Filter project-specific roles if requested
    const matchingRoleIds = new Set(
      userRoles
        .filter((ur) => !ur.projectId || (projectId && ur.projectId === projectId))
        .map((ur) => ur.roleId)
    );

    // 2. Resolve mapped permission IDs
    const permissionIds = new Set<string>();
    for (const rp of store.rolePermissions.values()) {
      if (matchingRoleIds.has(rp.roleId)) {
        permissionIds.add(rp.permissionId);
      }
    }

    return Array.from(permissionIds)
      .map((id) => store.permissions.get(id))
      .filter((p): p is DbPermission => Boolean(p));
  }
}

export const permissionRepository = new PermissionRepository();
