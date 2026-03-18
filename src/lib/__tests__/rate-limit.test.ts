import { checkRateLimit, RATE_LIMITS } from '../rate-limit';

describe('checkRateLimit', () => {
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

  it('RATE_LIMITS has required configs', () => {
    expect(RATE_LIMITS.agentCreate).toBeDefined();
    expect(RATE_LIMITS.agentCreate.limit).toBeGreaterThan(0);
    expect(RATE_LIMITS.agentCreate.windowMs).toBeGreaterThan(0);
  });
});
