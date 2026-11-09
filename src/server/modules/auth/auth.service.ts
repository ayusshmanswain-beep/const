// ==============================================================================
// AUTHENTICATION SERVICE
// Core Security Workflows: Login, MFA, Password Resets & Invitations
// ==============================================================================

import { BadRequestError, UnauthorizedError } from "../../core/errors/app-error";
import { ErrorCodes } from "../../core/errors/error-codes";
import { generateMfaSecret, getMfaOtpAuthUri, verifyTotpCode } from "../../core/security/mfa";
import { hashPassword, verifyPassword } from "../../core/security/password";
import { rateLimiter } from "../../core/security/rate-limiter";
import {
  createLogoutCookieConfig,
  createSessionCookieConfig,
  generateRandomToken,
  hashOpaqueToken,
  signSessionToken,
} from "../../core/security/tokens";
import { db } from "../../db/client";
import { auditService } from "../audit/audit.service";
import { authRepository, type AuthRepository } from "./auth.repository";
import type {
  AcceptInviteInput,
  AuthSessionResult,
  LoginInput,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
} from "./auth.types";

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

export class AuthService {
  private readonly repo: AuthRepository;

  constructor(repo: AuthRepository = authRepository) {
    this.repo = repo;
  }

  public async login(input: LoginInput, meta?: RequestMeta): Promise<AuthSessionResult> {
    const rateLimitKey = `login_${meta?.ipAddress || "global"}_${input.email.toLowerCase()}`;
    rateLimiter.enforce(rateLimitKey, 5, 60_000, "Too many login attempts. Please wait 60 seconds.");

    const user = await this.repo.findUserByEmail(input.email);

    if (!user) {
      await auditService.logEvent({
        action: "LOGIN_FAILED_UNKNOWN_USER",
        tableName: "users",
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        newData: { email: input.email },
      });
      throw new UnauthorizedError("Invalid email or password", ErrorCodes.INVALID_CREDENTIALS);
    }

    if (!user.isActive) {
      await auditService.logEvent({
        companyId: null,
        actorUserId: user.id,
        action: "LOGIN_FAILED_INACTIVE",
        tableName: "users",
        recordId: user.id,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
      throw new UnauthorizedError("Account has been deactivated. Please contact administrator.", ErrorCodes.ACCOUNT_INACTIVE);
    }

    const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      await auditService.logEvent({
        companyId: null,
        actorUserId: user.id,
        action: "LOGIN_FAILED_BAD_PASSWORD",
        tableName: "users",
        recordId: user.id,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
      throw new UnauthorizedError("Invalid email or password", ErrorCodes.INVALID_CREDENTIALS);
    }

    // Optional MFA Check for Privileged Users
    if (user.mfaEnabled) {
      if (!input.mfaCode) {
        return { mfaRequired: true };
      }

      const isValidCode = verifyTotpCode(user.mfaSecret || "", input.mfaCode);
      if (!isValidCode) {
        await auditService.logEvent({
          companyId: null,
          actorUserId: user.id,
          action: "LOGIN_FAILED_BAD_MFA",
          tableName: "users",
          recordId: user.id,
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        });
        throw new UnauthorizedError("Invalid two-factor authentication code", ErrorCodes.INVALID_MFA_CODE);
      }
    }

    // Resolve Default Company
    const defaultMembership = await this.repo.getUserDefaultCompany(user.id);
    const companyId = defaultMembership?.companyId || "c0000001-0000-0000-0000-000000000001";

    // Create Authenticated Session
    const rawSessionToken = generateRandomToken(32);
    const sessionTokenHash = hashOpaqueToken(rawSessionToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await this.repo.createSession(
      user.id,
      sessionTokenHash,
      expiresAt,
      meta?.ipAddress,
      meta?.userAgent
    );

    // Update Last Login
    user.lastLoginAt = new Date();
    user.lastLoginIp = meta?.ipAddress;
    await this.repo.updateUser(user);

    // Sign the Session ID for Cookie Placement
    const signedToken = signSessionToken(session.id);
    const cookieConfig = createSessionCookieConfig(signedToken);

    await auditService.logEvent({
      companyId,
      actorUserId: user.id,
      action: "LOGIN_SUCCESS",
      tableName: "user_sessions",
      recordId: session.id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      newData: { email: user.email, companyId },
    });

    return {
      mfaRequired: false,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        companyId,
        mfaEnabled: user.mfaEnabled,
      },
      cookieConfig,
    };
  }

  public async logout(sessionId: string, userId?: string, companyId?: string): Promise<{ cookieConfig: ReturnType<typeof createLogoutCookieConfig> }> {
    await this.repo.revokeSession(sessionId);

    if (userId) {
      await auditService.logEvent({
        companyId: companyId || null,
        actorUserId: userId,
        action: "LOGOUT",
        tableName: "user_sessions",
        recordId: sessionId,
      });
    }

    return {
      cookieConfig: createLogoutCookieConfig(),
    };
  }

  public async requestPasswordReset(
    input: PasswordResetRequestInput,
    meta?: RequestMeta
  ): Promise<{ message: string; devResetToken?: string }> {
    const rateLimitKey = `pwd_reset_${meta?.ipAddress || "global"}`;
    rateLimiter.enforce(rateLimitKey, 3, 300_000, "Too many password reset requests. Please wait 5 minutes.");

    const user = await this.repo.findUserByEmail(input.email);

    // Silent return to avoid account enumeration
    if (!user || !user.isActive) {
      return { message: "If that email exists in our system, a password reset link has been dispatched." };
    }

    const rawToken = generateRandomToken(32);
    const tokenHash = hashOpaqueToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.repo.createPasswordResetToken(user.id, tokenHash, expiresAt);

    await auditService.logEvent({
      companyId: null,
      actorUserId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      tableName: "users",
      recordId: user.id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      message: "If that email exists in our system, a password reset link has been dispatched.",
      devResetToken: process.env.NODE_ENV !== "production" ? rawToken : undefined,
    };
  }

  public async confirmPasswordReset(
    input: PasswordResetConfirmInput,
    meta?: RequestMeta
  ): Promise<{ message: string }> {
    const tokenHash = hashOpaqueToken(input.token);
    const resetRecord = await this.repo.findValidPasswordResetToken(tokenHash);

    if (!resetRecord) {
      throw new BadRequestError("Invalid or expired password reset token");
    }

    const user = await this.repo.findUserById(resetRecord.userId);
    if (!user || !user.isActive) {
      throw new BadRequestError("Invalid reset request: Account inactive or not found");
    }

    // Hash new password and revoke existing sessions
    user.passwordHash = await hashPassword(input.newPassword);
    await this.repo.updateUser(user);
    await this.repo.markPasswordResetTokenUsed(resetRecord.id);
    await this.repo.revokeAllUserSessions(user.id);

    await auditService.logEvent({
      companyId: null,
      actorUserId: user.id,
      action: "PASSWORD_RESET_COMPLETED",
      tableName: "users",
      recordId: user.id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return { message: "Password updated successfully. Prior active sessions have been terminated." };
  }

  public async acceptInvitation(input: AcceptInviteInput, meta?: RequestMeta): Promise<AuthSessionResult> {
    const tokenHash = hashOpaqueToken(input.token);
    const invitation = await this.repo.findValidInvitation(tokenHash);

    if (!invitation) {
      throw new BadRequestError("Invalid or expired organization invitation token");
    }

    let user = await this.repo.findUserByEmail(invitation.email);
    const store = db.getStore();

    if (!user) {
      // Create new user account
      const newPasswordHash = await hashPassword(input.password);
      user = {
        id: crypto.randomUUID(),
        email: invitation.email,
        passwordHash: newPasswordHash,
        fullName: input.fullName,
        isActive: true,
        isEmailVerified: true,
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.users.set(user.id, user);
    } else {
      user.fullName = input.fullName;
      user.passwordHash = await hashPassword(input.password);
      user.isActive = true;
      user.isEmailVerified = true;
      await this.repo.updateUser(user);
    }

    // Create Company Membership
    const membershipId = crypto.randomUUID();
    store.memberships.set(membershipId, {
      id: membershipId,
      userId: user.id,
      companyId: invitation.companyId,
      isDefault: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Assign Role
    const userRoleId = crypto.randomUUID();
    store.userRoles.set(userRoleId, {
      id: userRoleId,
      companyId: invitation.companyId,
      userId: user.id,
      roleId: invitation.roleId,
      createdAt: new Date(),
    });

    await this.repo.markInvitationAccepted(invitation.id);

    // Create Session
    const rawSessionToken = generateRandomToken(32);
    const sessionTokenHash = hashOpaqueToken(rawSessionToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await this.repo.createSession(user.id, sessionTokenHash, expiresAt, meta?.ipAddress, meta?.userAgent);
    const signedToken = signSessionToken(session.id);
    const cookieConfig = createSessionCookieConfig(signedToken);

    await auditService.logEvent({
      companyId: invitation.companyId,
      actorUserId: user.id,
      action: "INVITATION_ACCEPTED",
      tableName: "user_company_memberships",
      recordId: membershipId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      newData: { email: user.email, companyId: invitation.companyId, roleId: invitation.roleId },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        companyId: invitation.companyId,
        mfaEnabled: user.mfaEnabled,
      },
      cookieConfig,
    };
  }

  public async setupMfa(userId: string): Promise<{ secret: string; otpAuthUri: string }> {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new BadRequestError("User not found");

    const secret = generateMfaSecret();
    user.mfaSecret = secret;
    await this.repo.updateUser(user);

    const otpAuthUri = getMfaOtpAuthUri(secret, user.email);
    return { secret, otpAuthUri };
  }

  public async verifyMfaSetup(userId: string, code: string): Promise<{ verified: boolean }> {
    const user = await this.repo.findUserById(userId);
    if (!user || !user.mfaSecret) {
      throw new BadRequestError("MFA setup has not been initiated for this account");
    }

    const isValid = verifyTotpCode(user.mfaSecret, code);
    if (!isValid) {
      throw new BadRequestError("Invalid verification code. Please check your authenticator application.");
    }

    user.mfaEnabled = true;
    await this.repo.updateUser(user);

    await auditService.logEvent({
      companyId: null,
      actorUserId: user.id,
      action: "MFA_ENABLED",
      tableName: "users",
      recordId: user.id,
    });

    return { verified: true };
  }
}

export const authService = new AuthService();
