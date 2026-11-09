// ==============================================================================
// AUTHENTICATION REPOSITORY
// User Credentials, Sessions & Verification Tokens Data Access
// ==============================================================================

import { randomUUID } from "node:crypto";
import { db } from "../../db/client";
import type {
  DbPasswordResetToken,
  DbUser,
  DbUserCompanyMembership,
  DbUserInvitation,
  DbUserSession,
} from "../../db/types";

export class AuthRepository {
  public async findUserByEmail(email: string): Promise<DbUser | null> {
    const store = db.getStore();
    const normalized = email.toLowerCase().trim();
    for (const u of store.users.values()) {
      if (u.email.toLowerCase() === normalized) {
        return u;
      }
    }
    return null;
  }

  public async findUserById(id: string): Promise<DbUser | null> {
    const store = db.getStore();
    return store.users.get(id) || null;
  }

  public async updateUser(user: DbUser): Promise<DbUser> {
    const store = db.getStore();
    user.updatedAt = new Date();
    store.users.set(user.id, user);
    return user;
  }

  public async createSession(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    ipAddress?: string,
    userAgent?: string
  ): Promise<DbUserSession> {
    const store = db.getStore();
    const session: DbUserSession = {
      id: randomUUID(),
      userId,
      refreshTokenHash: tokenHash,
      ipAddress,
      userAgent,
      expiresAt,
      createdAt: new Date(),
    };

    store.sessions.set(session.id, session);
    return session;
  }

  public async revokeSession(sessionId: string): Promise<void> {
    const store = db.getStore();
    const session = store.sessions.get(sessionId);
    if (session) {
      session.revokedAt = new Date();
      store.sessions.set(sessionId, session);
    }
  }

  public async revokeAllUserSessions(userId: string): Promise<void> {
    const store = db.getStore();
    const now = new Date();
    for (const session of store.sessions.values()) {
      if (session.userId === userId && !session.revokedAt) {
        session.revokedAt = now;
        store.sessions.set(session.id, session);
      }
    }
  }

  public async getUserDefaultCompany(userId: string): Promise<DbUserCompanyMembership | null> {
    const store = db.getStore();
    const memberships = Array.from(store.memberships.values()).filter(
      (m) => m.userId === userId && m.isActive
    );

    if (memberships.length === 0) return null;
    return memberships.find((m) => m.isDefault) || memberships[0];
  }

  public async createPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<DbPasswordResetToken> {
    const store = db.getStore();
    const resetToken: DbPasswordResetToken = {
      id: randomUUID(),
      userId,
      tokenHash,
      expiresAt,
      usedAt: null,
      createdAt: new Date(),
    };

    store.passwordResetTokens.set(resetToken.id, resetToken);
    return resetToken;
  }

  public async findValidPasswordResetToken(tokenHash: string): Promise<DbPasswordResetToken | null> {
    const store = db.getStore();
    const now = new Date();
    for (const t of store.passwordResetTokens.values()) {
      if (t.tokenHash === tokenHash && !t.usedAt && t.expiresAt > now) {
        return t;
      }
    }
    return null;
  }

  public async markPasswordResetTokenUsed(id: string): Promise<void> {
    const store = db.getStore();
    const token = store.passwordResetTokens.get(id);
    if (token) {
      token.usedAt = new Date();
      store.passwordResetTokens.set(id, token);
    }
  }

  public async findValidInvitation(tokenHash: string): Promise<DbUserInvitation | null> {
    const store = db.getStore();
    const now = new Date();
    for (const inv of store.invitations.values()) {
      if (inv.tokenHash === tokenHash && !inv.acceptedAt && inv.expiresAt > now) {
        return inv;
      }
    }
    return null;
  }

  public async markInvitationAccepted(id: string): Promise<void> {
    const store = db.getStore();
    const inv = store.invitations.get(id);
    if (inv) {
      inv.acceptedAt = new Date();
      store.invitations.set(id, inv);
    }
  }
}

export const authRepository = new AuthRepository();
