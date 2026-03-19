/**
 * @jest-environment node
 */
import { isLLMConfigured } from '../llm';

describe('isLLMConfigured', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns false when OPENAI_API_KEY is not set', () => {
    delete process.env.OPENAI_API_KEY;
    expect(isLLMConfigured()).toBe(false);
  });

  it('returns false when OPENAI_API_KEY is placeholder', () => {
    process.env.OPENAI_API_KEY = 'sk-your-key-here';
    expect(isLLMConfigured()).toBe(false);
  });

  it('returns false when OPENAI_API_KEY is empty', () => {
    process.env.OPENAI_API_KEY = '';
    expect(isLLMConfigured()).toBe(false);
  });

  it('returns true when OPENAI_API_KEY is a real key', () => {
    process.env.OPENAI_API_KEY = 'sk-abc123real';
    expect(isLLMConfigured()).toBe(true);
  });
});
