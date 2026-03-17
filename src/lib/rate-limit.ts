/**
 * Simple in-memory rate limiter using sliding window.
 * Not suitable for multi-instance deployments; use Redis-backed
 * rate limiting for production scale.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 120_000);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}, 300_000);

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

/**
 * Check if a request is allowed under the rate limit.
 * @param key - Unique identifier (e.g., userId, IP + route)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key) ?? { timestamps: [] };

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < config.windowMs,
  );

  if (entry.timestamps.length >= config.limit) {
    const oldest = entry.timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      resetMs: oldest + config.windowMs - now,
    };
  }

  entry.timestamps.push(now);
  store.set(key, entry);

  return {
    allowed: true,
    remaining: config.limit - entry.timestamps.length,
    resetMs: config.windowMs,
  };
}

/** Pre-configured rate limits for common operations */
export const RATE_LIMITS = {
  /** Agent creation: 5 per minute */
  agentCreate: { limit: 5, windowMs: 60_000 },
  /** Event creation: 3 per minute */
  eventCreate: { limit: 3, windowMs: 60_000 },
  /** Date execution: 10 per minute */
  dateRun: { limit: 10, windowMs: 60_000 },
  /** General API: 60 per minute */
  general: { limit: 60, windowMs: 60_000 },
} as const;
