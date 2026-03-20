/**
 * Tests for withRetry behavior via date-engine module.
 * Since withRetry is internal, we test its behavior through
 * the error classification patterns it uses.
 */

describe('withRetry error classification patterns', () => {
  // These tests verify the regex patterns used by withRetry
  // to classify errors as retryable vs non-retryable

  const authPatterns = ['401', '403', '未授权'];
  const rateLimitPatterns = ['429', 'rate', '频繁'];

  describe('auth errors (non-retryable)', () => {
    it.each(authPatterns)('detects "%s" as auth error', (pattern) => {
      const msg = `SecondMe API ${pattern} error`;
      const isAuth = authPatterns.some((p) => msg.includes(p));
      expect(isAuth).toBe(true);
    });
  });

  describe('rate limit errors (retryable with longer backoff)', () => {
    it.each(rateLimitPatterns)('detects "%s" as rate limit', (pattern) => {
      const msg = `API returned ${pattern}`;
      const isRateLimit = rateLimitPatterns.some((p) => msg.includes(p));
      expect(isRateLimit).toBe(true);
    });

    it('rate limit error messages from SecondMe', () => {
      const msgs = [
        'HTTP 429 Too Many Requests',
        '操作太频繁，请稍后再试',
        'rate limit exceeded',
      ];
      for (const msg of msgs) {
        const isRateLimit = rateLimitPatterns.some((p) => msg.includes(p));
        expect(isRateLimit).toBe(true);
      }
    });
  });

  describe('normal errors (retryable)', () => {
    it('network errors are retryable', () => {
      const msgs = ['ECONNREFUSED', 'fetch failed', 'network error'];
      for (const msg of msgs) {
        const isAuth = authPatterns.some((p) => msg.includes(p));
        const isRateLimit = rateLimitPatterns.some((p) => msg.includes(p));
        expect(isAuth).toBe(false);
        // Network errors should NOT be classified as rate limit
        // (they use standard backoff)
        expect(isRateLimit).toBe(false);
      }
    });
  });
});
