import { computeSmartCompatibility, AgentForMatching } from '../matchmaker';

// Mock the llm module
jest.mock('@/lib/llm', () => ({
  isLLMConfigured: jest.fn().mockReturnValue(false),
  chatCompletion: jest.fn(),
}));

const agent = (
  id: string,
  name: string,
  interests: string[],
  personality: string,
): AgentForMatching => ({
  id,
  name,
  interests: JSON.stringify(interests),
  personalityType: personality,
});

describe('computeSmartCompatibility', () => {
  it('returns score between 0 and 100', () => {
    const a = agent('1', 'Alice', ['cooking', 'travel'], '浪漫');
    const b = agent('2', 'Bob', ['music', 'sports'], '幽默');
    const result = computeSmartCompatibility(a, b);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.reasoning).toBeTruthy();
  });

  it('gives higher score for overlapping interests', () => {
    const a = agent('1', 'Alice', ['cooking', 'travel', 'music'], '温柔');
    const b = agent('2', 'Bob', ['cooking', 'travel', 'reading'], '温柔');
    const c = agent('3', 'Charlie', ['sports', 'gaming', 'coding'], '理性');

    const abScore = computeSmartCompatibility(a, b).score;
    const acScore = computeSmartCompatibility(a, c).score;
    expect(abScore).toBeGreaterThan(acScore);
  });

  it('gives bonus for complementary personality types', () => {
    const romantic = agent('1', 'Alice', ['cooking'], '浪漫');
    const gentle = agent('2', 'Bob', ['cooking'], '温柔');
    const rational = agent('3', 'Charlie', ['cooking'], '理性');

    const romanticGentleScore = computeSmartCompatibility(romantic, gentle).score;
    const romanticRationalScore = computeSmartCompatibility(romantic, rational).score;
    // 浪漫 + 温柔 is a complementary pair, should score higher
    expect(romanticGentleScore).toBeGreaterThan(romanticRationalScore);
  });

  it('handles empty interests gracefully', () => {
    const a = agent('1', 'Alice', [], '');
    const b = agent('2', 'Bob', [], '');
    const result = computeSmartCompatibility(a, b);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.reasoning).toBeTruthy();
  });

  it('handles agents with same personality', () => {
    const a = agent('1', 'Alice', ['travel'], '文艺');
    const b = agent('2', 'Bob', ['music'], '文艺');
    const result = computeSmartCompatibility(a, b);
    // Same personality should get a reasonable score
    expect(result.score).toBeGreaterThanOrEqual(15);
  });

  it('generates Chinese reasoning', () => {
    const a = agent('1', 'Alice', ['cooking'], '吃货');
    const b = agent('2', 'Bob', ['cooking'], '美食');
    const result = computeSmartCompatibility(a, b);
    // Reasoning should contain Chinese characters
    expect(result.reasoning).toMatch(/[\u4e00-\u9fff]/);
  });

  it('includes interest overlap in reasoning when present', () => {
    const a = agent('1', 'Alice', ['cooking', 'travel'], '浪漫');
    const b = agent('2', 'Bob', ['cooking', 'sports'], '幽默');
    const result = computeSmartCompatibility(a, b);
    expect(result.reasoning).toContain('cooking');
  });

  it('scores maximum 100', () => {
    // Agent with everything matching
    const a = agent('1', 'Alice', ['cooking', 'travel', 'music'], '浪漫');
    const b = agent('2', 'Bob', ['cooking', 'travel', 'music'], '温柔');
    const result = computeSmartCompatibility(a, b);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
