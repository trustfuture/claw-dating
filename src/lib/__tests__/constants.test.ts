import { EVENT_LIMITS, PAGINATION, POLLING } from '../constants';

describe('constants', () => {
  it('EVENT_LIMITS has valid ranges', () => {
    expect(EVENT_LIMITS.MIN_ROUNDS).toBeLessThanOrEqual(EVENT_LIMITS.MAX_ROUNDS);
    expect(EVENT_LIMITS.DEFAULT_ROUNDS).toBeGreaterThanOrEqual(EVENT_LIMITS.MIN_ROUNDS);
    expect(EVENT_LIMITS.DEFAULT_ROUNDS).toBeLessThanOrEqual(EVENT_LIMITS.MAX_ROUNDS);
    expect(EVENT_LIMITS.MIN_TURNS_PER_AGENT).toBeLessThanOrEqual(EVENT_LIMITS.MAX_TURNS_PER_AGENT);
    expect(EVENT_LIMITS.DEFAULT_TURNS_PER_AGENT).toBeGreaterThanOrEqual(EVENT_LIMITS.MIN_TURNS_PER_AGENT);
    expect(EVENT_LIMITS.DEFAULT_TURNS_PER_AGENT).toBeLessThanOrEqual(EVENT_LIMITS.MAX_TURNS_PER_AGENT);
  });

  it('PAGINATION has valid defaults', () => {
    expect(PAGINATION.DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(PAGINATION.MAX_PAGE_SIZE);
    expect(PAGINATION.DEFAULT_PAGE_SIZE).toBeGreaterThan(0);
  });

  it('POLLING intervals are positive', () => {
    expect(POLLING.EVENT_POLL_INTERVAL_MS).toBeGreaterThan(0);
    expect(POLLING.WATCH_POLL_INTERVAL_MS).toBeGreaterThan(0);
  });
});
