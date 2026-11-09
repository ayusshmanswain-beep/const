// ==============================================================================
// AUTHENTICATION MODULE SCHEMAS & TYPES
// ==============================================================================

import { z } from "zod";

export const LoginInputSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address format" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
  mfaCode: z.string().trim().length(6, { message: "MFA code must be exactly 6 digits" }).optional(),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

export const PasswordResetRequestSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address format" }),
});

export type PasswordResetRequestInput = z.infer<typeof PasswordResetRequestSchema>;

export const PasswordResetConfirmSchema = z.object({
  token: z.string().min(16, { message: "Invalid or missing reset token" }),
  newPassword: z.string().min(8, { message: "New password must be at least 8 characters long" }),
});

export type PasswordResetConfirmInput = z.infer<typeof PasswordResetConfirmSchema>;

export const AcceptInviteSchema = z.object({
  token: z.string().min(16, { message: "Invalid or missing invitation token" }),
  fullName: z.string().trim().min(2, { message: "Full name must be at least 2 characters long" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
});

export type AcceptInviteInput = z.infer<typeof AcceptInviteSchema>;

export const MfaVerifySchema = z.object({
  code: z.string().trim().length(6, { message: "MFA verification code must be 6 digits" }),
});

export type MfaVerifyInput = z.infer<typeof MfaVerifySchema>;

export interface AuthSessionResult {
  mfaRequired?: boolean;
  user?: {
    id: string;
    email: string;
    fullName: string;
    companyId: string;
    mfaEnabled: boolean;
  };
  cookieConfig?: {
    name: string;
    value: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax" | "strict" | "none";
    path: string;
    maxAge?: number;
  };
}
