import { Redis } from "@upstash/redis";

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

// Redis client (lazy init, null if not configured)
let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    redis = new Redis({ url, token });
  }
  return redis;
}

// In-memory fallback
const memStore = new Map<string, { count: number; resetAt: number }>();

function checkMemoryRateLimit(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const entry = memStore.get(key);

  if (!entry || now >= entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetMs: config.windowMs,
    };
  }

  entry.count++;
  if (entry.count > config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: entry.resetAt - now,
    };
  }

  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetMs: entry.resetAt - now,
  };
}

// Periodic cleanup of expired memory entries
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memStore) {
      if (now >= entry.resetAt) memStore.delete(key);
    }
  }, 60_000);
}

async function checkRedisRateLimit(
  client: Redis,
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const redisKey = `rl:${key}`;
  const windowSec = Math.ceil(config.windowMs / 1000);

  try {
    const count = await client.incr(redisKey);
    if (count === 1) {
      await client.expire(redisKey, windowSec);
    }

    if (count > config.limit) {
      return { allowed: false, remaining: 0, resetMs: config.windowMs };
    }

    return {
      allowed: true,
      remaining: config.limit - count,
      resetMs: config.windowMs,
    };
  } catch {
    // Redis failure: fall back to memory
    return checkMemoryRateLimit(key, config);
  }
}

/**
 * Check rate limit synchronously using in-memory store.
 * Kept for backwards compatibility with existing sync callers.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  return checkMemoryRateLimit(key, config);
}

/**
 * Check rate limit asynchronously. Uses Redis when UPSTASH_REDIS_REST_URL
 * and UPSTASH_REDIS_REST_TOKEN are configured, falls back to in-memory otherwise.
 */
export async function checkRateLimitAsync(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const client = getRedis();
  if (client) {
    return checkRedisRateLimit(client, key, config);
  }
  return checkMemoryRateLimit(key, config);
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
  /** A2A agent registration: 3 per minute */
  a2aRegister: { limit: 3, windowMs: 60_000 },
  /** Scoreboard fetch: 10 per 10 seconds */
  scoreboardFetch: { limit: 10, windowMs: 10_000 },
} as const;
