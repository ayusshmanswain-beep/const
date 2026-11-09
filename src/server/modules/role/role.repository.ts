// ==============================================================================
// ROLE REPOSITORY
// Role Definitions & Authority Join Mapping Data Access
// ==============================================================================

import { randomUUID } from "node:crypto";
import { db } from "../../db/client";
import type { DbRole } from "../../db/types";
import type { CreateRoleInput, UpdateRoleInput } from "./role.types";

export interface RoleWithPermissions extends DbRole {
  permissions: Array<{ id: string; code: string; action: string; resource: string }>;
}

export class RoleRepository {
  public async findById(id: string): Promise<DbRole | null> {
    const store = db.getStore();
    return store.roles.get(id) || null;
  }

  public async findManyByCompany(companyId: string): Promise<RoleWithPermissions[]> {
    const store = db.getStore();

    // Include company roles and system-wide roles (companyId === null)
    const roles = Array.from(store.roles.values()).filter(
      (r) => r.companyId === companyId || r.companyId === null
    );

    return roles.map((role) => {
      const perms = Array.from(store.rolePermissions.values())
        .filter((rp) => rp.roleId === role.id)
        .map((rp) => store.permissions.get(rp.permissionId))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => ({
          id: p.id,
          code: p.code,
          action: p.action,
          resource: p.resource,
        }));

      return {
        ...role,
        permissions: perms,
      };
    });
  }

  public async create(companyId: string, input: CreateRoleInput): Promise<DbRole> {
    const store = db.getStore();
    const role: DbRole = {
      id: randomUUID(),
      companyId,
      name: input.name,
      slug: input.slug,
      description: input.description,
      isSystemRole: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    store.roles.set(role.id, role);

    for (const permId of input.permissionIds) {
      store.rolePermissions.set(`${role.id}_${permId}`, {
        roleId: role.id,
        permissionId: permId,
        createdAt: new Date(),
      });
    }

    return role;
  }

  public async update(id: string, input: UpdateRoleInput): Promise<DbRole | null> {
    const store = db.getStore();
    const role = store.roles.get(id);
    if (!role) return null;

    if (input.name !== undefined) role.name = input.name;
    if (input.description !== undefined) role.description = input.description;

    role.updatedAt = new Date();
    store.roles.set(id, role);
    return role;
  }

  public async setPermissions(roleId: string, permissionIds: string[]): Promise<void> {
    const store = db.getStore();

    // Evict old mappings
    for (const [key, rp] of store.rolePermissions.entries()) {
      if (rp.roleId === roleId) {
        store.rolePermissions.delete(key);
      }
    }

    // Set new mappings
    const now = new Date();
    for (const permId of permissionIds) {
      store.rolePermissions.set(`${roleId}_${permId}`, {
        roleId,
        permissionId: permId,
        createdAt: now,
      });
    }
  }
}

export const roleRepository = new RoleRepository();
