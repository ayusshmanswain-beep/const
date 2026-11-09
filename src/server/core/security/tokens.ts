// ==============================================================================
// CONSTRUCT360 SECURE TOKEN & SESSION CIPHERS
// Cryptographic Token Generation, SHA-256 Digesting & HMAC Session Signatures
// ==============================================================================

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "construct360-dev-insecure-secret-key-32chars!";

export function generateRandomToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("hex");
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Signs a session payload or session ID using HMAC-SHA256
 */
export function signSessionToken(sessionId: string): string {
  const signature = createHmac("sha256", SESSION_SECRET).update(sessionId).digest("base64url");
  return `${sessionId}.${signature}`;
}

/**
 * Validates a signed session token. Returns sessionId if valid, null otherwise.
 */
export function verifySessionToken(signedToken: string): string | null {
  if (!signedToken || typeof signedToken !== "string") return null;

  const dotIndex = signedToken.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const sessionId = signedToken.substring(0, dotIndex);
  const signature = signedToken.substring(dotIndex + 1);

  if (!sessionId || !signature) return null;

  const expectedSignature = createHmac("sha256", SESSION_SECRET).update(sessionId).digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expBuf)) return null;

  return sessionId;
}

export const SESSION_COOKIE_NAME = "c360_session";
export const CSRF_COOKIE_NAME = "c360_csrf";

export interface CookieOptions {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge?: number;
  expires?: Date;
}

export function createSessionCookieConfig(signedToken: string, maxAgeSeconds = 7 * 24 * 60 * 60): CookieOptions {
  return {
    name: SESSION_COOKIE_NAME,
    value: signedToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function createLogoutCookieConfig(): CookieOptions {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  };
}
