jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(),
}));

import { checkRateLimit, checkRateLimitAsync, RATE_LIMITS } from '../rate-limit';

describe('checkRateLimit (sync / in-memory)', () => {
  it('allows requests within limit', () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    const result = checkRateLimit(key, RATE_LIMITS.agentCreate);
    expect(result.allowed).toBe(true);
  });

  it('blocks requests exceeding limit', () => {
    const key = `test-block-${Date.now()}-${Math.random()}`;
    const config = { windowMs: 60_000, limit: 2 };

    checkRateLimit(key, config);
    checkRateLimit(key, config);
    const result = checkRateLimit(key, config);
    expect(result.allowed).toBe(false);
  });

  it('returns remaining count', () => {
    const key = `test-remaining-${Date.now()}-${Math.random()}`;
    const config = { windowMs: 60_000, limit: 3 };

    const r1 = checkRateLimit(key, config);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(key, config);
    expect(r2.remaining).toBe(1);
  });

  it('RATE_LIMITS has required configs', () => {
    expect(RATE_LIMITS.agentCreate).toBeDefined();
    expect(RATE_LIMITS.agentCreate.limit).toBeGreaterThan(0);
    expect(RATE_LIMITS.agentCreate.windowMs).toBeGreaterThan(0);
    expect(RATE_LIMITS.eventCreate).toBeDefined();
    expect(RATE_LIMITS.dateRun).toBeDefined();
    expect(RATE_LIMITS.general).toBeDefined();
    expect(RATE_LIMITS.a2aRegister).toBeDefined();
    expect(RATE_LIMITS.scoreboardFetch).toBeDefined();
  });
});

describe('checkRateLimitAsync (falls back to memory without Redis)', () => {
  it('allows requests within limit', async () => {
    const key = `test-async-${Date.now()}-${Math.random()}`;
    const result = await checkRateLimitAsync(key, RATE_LIMITS.agentCreate);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMITS.agentCreate.limit - 1);
  });

  it('blocks requests exceeding limit', async () => {
    const key = `test-async-block-${Date.now()}-${Math.random()}`;
    const config = { windowMs: 60_000, limit: 2 };

    await checkRateLimitAsync(key, config);
    await checkRateLimitAsync(key, config);
    const result = await checkRateLimitAsync(key, config);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
