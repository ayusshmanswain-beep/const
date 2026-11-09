// ==============================================================================
// CONSTRUCT360 RATE LIMITER
// Serverless-Friendly Sliding Window Rate Limiter (Zero Background Daemons)
// ==============================================================================

import { RateLimitError } from "../errors/app-error";

interface RateLimitRecord {
  timestamps: number[];
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

class SlidingWindowRateLimiter {
  // Uses a Map without background setInterval to remain 100% serverless-safe
  private store = new Map<string, RateLimitRecord>();
  private lastPurge = Date.now();
  private purgeIntervalMs = 60_000; // Lazy purge every 60s during requests

  private lazyCleanup(now: number, maxWindowMs: number): void {
    if (now - this.lastPurge < this.purgeIntervalMs) return;
    this.lastPurge = now;

    const threshold = now - maxWindowMs;
    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > threshold);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }

  public check(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    this.lazyCleanup(now, windowMs);

    const threshold = now - windowMs;
    const record = this.store.get(key) || { timestamps: [] };

    // Evict timestamps outside current window
    record.timestamps = record.timestamps.filter((ts) => ts > threshold);

    if (record.timestamps.length >= limit) {
      const oldest = record.timestamps[0];
      const resetSeconds = Math.ceil((oldest + windowMs - now) / 1000);
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetSeconds: Math.max(1, resetSeconds),
      };
    }

    record.timestamps.push(now);
    this.store.set(key, record);

    const remaining = Math.max(0, limit - record.timestamps.length);
    const resetSeconds = Math.ceil(windowMs / 1000);

    return {
      allowed: true,
      limit,
      remaining,
      resetSeconds,
    };
  }

  public enforce(key: string, limit: number, windowMs: number, customMessage?: string): RateLimitResult {
    const result = this.check(key, limit, windowMs);
    if (!result.allowed) {
      throw new RateLimitError(
        customMessage || `Rate limit exceeded. Maximum ${limit} requests per ${Math.round(windowMs / 1000)} seconds.`,
        result.resetSeconds
      );
    }
    return result;
  }

  public clear(): void {
    this.store.clear();
  }
}

export const rateLimiter = new SlidingWindowRateLimiter();
