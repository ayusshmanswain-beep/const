// ==============================================================================
// AUTHENTICATION UNIT & INTEGRATION TESTS
// Tests Login, Password Hashing, Session Invariants, MFA & Password Reset
// ==============================================================================

import assert from "node:assert/strict";
import test from "node:test";
import { generateTotpCode } from "../src/server/core/security/mfa";
import { hashPassword, verifyPassword } from "../src/server/core/security/password";
import { rateLimiter } from "../src/server/core/security/rate-limiter";
import { signSessionToken, verifySessionToken } from "../src/server/core/security/tokens";
import { dataStore } from "../src/server/db/store";
import { authService } from "../src/server/modules/auth/auth.service";

test("Password Hashing & Constant-Time Verification", async () => {
  const password = "P@ssw0rdSecure2026!";
  const hash = await hashPassword(password);

  assert.ok(hash.startsWith("scrypt:"), "Hash must follow scrypt specification");
  assert.equal(await verifyPassword(password, hash), true, "Valid password must verify to true");
  assert.equal(await verifyPassword("WrongPassword123", hash), false, "Invalid password must verify to false");
  assert.equal(await verifyPassword("", hash), false, "Empty password must verify to false");
});

test("Session Signing & Verification", () => {
  const sessionId = "session_test_uuid_12345";
  const signed = signSessionToken(sessionId);

  assert.ok(signed.includes("."), "Signed session token must have separator dot");
  const extracted = verifySessionToken(signed);
  assert.equal(extracted, sessionId, "Verified session token must return original session ID");

  // Tampered token test
  const tampered = signed.replace("session", "compromised");
  assert.equal(verifySessionToken(tampered), null, "Tampered signature must be rejected");

  // Malformed token test
  assert.equal(verifySessionToken("random_string_without_sig"), null, "Malformed token must be rejected");
});

test("Rate Limiter Enforces Maximum Request Thresholds", () => {
  rateLimiter.clear();
  const testKey = "rate_limit_test_client_ip";

  // Allowed 3 requests per 10 seconds
  const res1 = rateLimiter.check(testKey, 3, 10_000);
  assert.equal(res1.allowed, true);
  assert.equal(res1.remaining, 2);

  const res2 = rateLimiter.check(testKey, 3, 10_000);
  assert.equal(res2.allowed, true);
  assert.equal(res2.remaining, 1);

  const res3 = rateLimiter.check(testKey, 3, 10_000);
  assert.equal(res3.allowed, true);
  assert.equal(res3.remaining, 0);

  // 4th request must be blocked
  const res4 = rateLimiter.check(testKey, 3, 10_000);
  assert.equal(res4.allowed, false, "4th request must exceed limit");
  assert.equal(res4.remaining, 0);
  assert.ok(res4.resetSeconds > 0);

  rateLimiter.clear();
});

test("Login Flow - Standard User Authentication", async () => {
  dataStore.reset();
  rateLimiter.clear();

  // Project Manager without MFA: suresh.kumar@apexinfra.com
  const loginRes = await authService.login({
    email: "suresh.kumar@apexinfra.com",
    password: "Construct360#Secure2026",
  });

  assert.equal(loginRes.mfaRequired, false, "Non-MFA user should not trigger MFA challenge");
  assert.ok(loginRes.user, "User profile must be returned on successful login");
  assert.equal(loginRes.user?.email, "suresh.kumar@apexinfra.com");
  assert.ok(loginRes.cookieConfig, "Session cookie must be configured");
  assert.equal(loginRes.cookieConfig?.httpOnly, true, "Cookie must be HTTP-only");
});

test("Login Flow - Bad Password Rejection", async () => {
  dataStore.reset();
  rateLimiter.clear();

  await assert.rejects(
    async () => {
      await authService.login({
        email: "suresh.kumar@apexinfra.com",
        password: "IncorrectPassword999!",
      });
    },
    {
      name: "UnauthorizedError",
      message: "Invalid email or password",
    }
  );
});

test("Login Flow - MFA Protected User Requires Valid Code", async () => {
  dataStore.reset();
  rateLimiter.clear();

  // Rajesh Menon has MFA enabled with secret: JBSWY3DPEHPK3PXP
  const challengeRes = await authService.login({
    email: "rajesh.menon@apexinfra.com",
    password: "Construct360#Secure2026",
  });

  assert.equal(challengeRes.mfaRequired, true, "MFA enabled user must receive mfaRequired challenge when code omitted");

  // Generate valid TOTP code
  const validCode = generateTotpCode("JBSWY3DPEHPK3PXP");

  const successRes = await authService.login({
    email: "rajesh.menon@apexinfra.com",
    password: "Construct360#Secure2026",
    mfaCode: validCode,
  });

  assert.equal(successRes.mfaRequired, false);
  assert.equal(successRes.user?.email, "rajesh.menon@apexinfra.com");
});

test("Password Reset Workflow", async () => {
  dataStore.reset();
  rateLimiter.clear();

  const resetReq = await authService.requestPasswordReset({
    email: "suresh.kumar@apexinfra.com",
  });

  assert.ok(resetReq.devResetToken, "Dev reset token should be returned in development mode");

  const newPassword = "NewSecurePassword2026#";
  const confirmRes = await authService.confirmPasswordReset({
    token: resetReq.devResetToken!,
    newPassword,
  });

  assert.ok(confirmRes.message.includes("Password updated successfully"));

  // Verify login with new password succeeds
  const loginRes = await authService.login({
    email: "suresh.kumar@apexinfra.com",
    password: newPassword,
  });

  assert.equal(loginRes.user?.email, "suresh.kumar@apexinfra.com");
});
