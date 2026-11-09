// ==============================================================================
// USER REPOSITORY
// User Accounts, Memberships & Role Assignments Data Access
// ==============================================================================

import { randomUUID } from "node:crypto";
import { db } from "../../db/client";
import type { DbUser, DbUserInvitation } from "../../db/types";
import type { QueryUsersParams, UpdateUserInput } from "./user.types";

export interface UserWithRolesSummary extends DbUser {
  roles: Array<{ roleId: string; roleName: string; roleSlug: string; projectId?: string | null }>;
}

export class UserRepository {
  public async findById(id: string): Promise<DbUser | null> {
    const store = db.getStore();
    return store.users.get(id) || null;
  }

  public async findManyByCompany(
    companyId: string,
    params: QueryUsersParams
  ): Promise<{ data: UserWithRolesSummary[]; total: number }> {
    const store = db.getStore();

    // Find users with active memberships in target company
    const memberUserIds = new Set(
      Array.from(store.memberships.values())
        .filter((m) => m.companyId === companyId)
        .map((m) => m.userId)
    );

    let users = Array.from(store.users.values()).filter((u) => memberUserIds.has(u.id));

    if (params.status === "active") {
      users = users.filter((u) => u.isActive);
    } else if (params.status === "inactive") {
      users = users.filter((u) => !u.isActive);
    }

    if (params.search) {
      const q = params.search.toLowerCase();
      users = users.filter(
        (u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }

    const total = users.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const sliced = users.slice(offset, offset + limit);

    const data: UserWithRolesSummary[] = sliced.map((user) => {
      const userRoles = Array.from(store.userRoles.values())
        .filter((ur) => ur.userId === user.id && ur.companyId === companyId)
        .map((ur) => {
          const role = store.roles.get(ur.roleId);
          return {
            roleId: ur.roleId,
            roleName: role?.name || "Unknown",
            roleSlug: role?.slug || "unknown",
            projectId: ur.projectId,
          };
        });

      return {
        ...user,
        roles: userRoles,
      };
    });

    return { data, total };
  }

  public async createInvitation(
    email: string,
    companyId: string,
    roleId: string,
    tokenHash: string,
    invitedByUserId: string,
    expiresAt: Date
  ): Promise<DbUserInvitation> {
    const store = db.getStore();
    const inv: DbUserInvitation = {
      id: randomUUID(),
      email: email.toLowerCase(),
      companyId,
      roleId,
      tokenHash,
      invitedByUserId,
      expiresAt,
      acceptedAt: null,
      createdAt: new Date(),
    };

    store.invitations.set(inv.id, inv);
    return inv;
  }

  public async update(id: string, input: UpdateUserInput): Promise<DbUser | null> {
    const store = db.getStore();
    const user = store.users.get(id);
    if (!user) return null;

    if (input.fullName !== undefined) user.fullName = input.fullName;
    if (input.phoneNumber !== undefined) user.phoneNumber = input.phoneNumber;

    user.updatedAt = new Date();
    store.users.set(id, user);
    return user;
  }

  public async setStatus(id: string, isActive: boolean): Promise<DbUser | null> {
    const store = db.getStore();
    const user = store.users.get(id);
    if (!user) return null;

    user.isActive = isActive;
    user.updatedAt = new Date();
    store.users.set(id, user);
    return user;
  }

  public async assignRoles(
    userId: string,
    companyId: string,
    roleIds: string[],
    projectId?: string
  ): Promise<void> {
    const store = db.getStore();

    // Clear existing roles for this scope
    for (const [key, ur] of store.userRoles.entries()) {
      if (ur.userId === userId && ur.companyId === companyId && ur.projectId === (projectId || null)) {
        store.userRoles.delete(key);
      }
    }

    // Add new role assignments
    for (const roleId of roleIds) {
      const id = randomUUID();
      store.userRoles.set(id, {
        id,
        companyId,
        userId,
        roleId,
        projectId: projectId || null,
        createdAt: new Date(),
      });
    }
  }
}

export const userRepository = new UserRepository();
