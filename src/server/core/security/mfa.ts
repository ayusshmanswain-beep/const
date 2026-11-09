// ==============================================================================
// CONSTRUCT360 MULTI-FACTOR AUTHENTICATION (RFC 6238 TOTP ENGINE)
// Native Cryptographic Time-Based One-Time Password Engine
// ==============================================================================

import { createHmac, randomBytes } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function generateMfaSecret(): string {
  const bytes = randomBytes(20); // 160 bits
  return base32Encode(bytes);
}

export function generateTotpCode(secretBase32: string, timeStep = Math.floor(Date.now() / 1000 / 30)): string {
  const key = base32Decode(secretBase32);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(timeStep), 0);

  const hmac = createHmac("sha1", key).update(timeBuffer).digest();

  // Dynamic truncation (RFC 4226)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binaryCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binaryCode % 1_000_000;
  return otp.toString().padStart(6, "0");
}

export function verifyTotpCode(secretBase32: string, token: string, windowSteps = 1): boolean {
  if (!token || token.length !== 6 || !/^\d{6}$/.test(token)) return false;

  const currentStep = Math.floor(Date.now() / 1000 / 30);

  // Check [current - 1, current, current + 1] to tolerate 30-sec drift
  for (let stepOffset = -windowSteps; stepOffset <= windowSteps; stepOffset++) {
    const expected = generateTotpCode(secretBase32, currentStep + stepOffset);
    if (expected === token) {
      return true;
    }
  }

  return false;
}

export function getMfaOtpAuthUri(secretBase32: string, email: string, issuer = "CONSTRUCT360"): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secretBase32}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}
