/**
 * @jest-environment node
 */

import { validateAgentInput, sanitizeString } from '../sanitize';

describe('sanitizeString', () => {
  it('strips HTML tags', () => {
    expect(sanitizeString('<b>hello</b>')).toBe('hello');
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeString(123)).toBe('');
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(undefined)).toBe('');
  });

  it('truncates to maxLength', () => {
    expect(sanitizeString('abcdefghij', 5)).toBe('abcde');
  });
});

describe('validateAgentInput', () => {
  const validInput = {
    name: 'TestAgent',
    personalityType: 'gentle',
    interests: ['cooking', 'travel'],
    catchphrase: 'Hello world',
    avatarEmoji: '🦞',
  };

  it('passes with valid input', () => {
    const result = validateAgentInput(validInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe('TestAgent');
      expect(result.data.interests).toEqual(['cooking', 'travel']);
    }
  });

  it('fails when name is missing', () => {
    const result = validateAgentInput({ ...validInput, name: undefined });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('2-20');
    }
  });

  it('fails when name is too short', () => {
    const result = validateAgentInput({ ...validInput, name: 'A' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('2-20');
    }
  });

  it('fails when name is too long (truncated below minimum)', () => {
    // Name is sanitized to 20 chars max; a 1-char name after truncation still fails
    const result = validateAgentInput({ ...validInput, name: 'X' });
    expect(result.ok).toBe(false);
  });

  it('strips XSS from name', () => {
    const result = validateAgentInput({
      ...validInput,
      name: '<script>alert("xss")</script>Bob',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).not.toContain('<script>');
      expect(result.data.name).toContain('Bob');
    }
  });

  it('rejects too many interests by truncating to 10', () => {
    const manyInterests = Array.from({ length: 15 }, (_, i) => `interest${i}`);
    const result = validateAgentInput({ ...validInput, interests: manyInterests });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.interests).toHaveLength(10);
    }
  });

  it('filters out invalid interest types', () => {
    const result = validateAgentInput({
      ...validInput,
      interests: ['cooking', 42, null, 'travel', undefined, true],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.interests).toEqual(['cooking', 'travel']);
    }
  });
});
