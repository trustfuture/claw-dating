import {
  createPairings,
  pairKey,
  AgentForMatching,
} from '../matchmaker';

// Mock the llm module since matchmaker imports it
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

describe('pairKey', () => {
  it('returns consistent key regardless of argument order', () => {
    expect(pairKey('a', 'b')).toBe(pairKey('b', 'a'));
  });

  it('produces a colon-separated sorted key', () => {
    expect(pairKey('z', 'a')).toBe('a:z');
  });
});

describe('createPairings', () => {
  it('pairs an even number of agents', () => {
    const agents = [
      agent('1', 'Alice', ['cooking'], 'gentle'),
      agent('2', 'Bob', ['travel'], 'adventurous'),
      agent('3', 'Carol', ['music'], 'artistic'),
      agent('4', 'Dave', ['sports'], 'sporty'),
    ];

    const result = createPairings(agents);
    expect(result).toHaveLength(2);

    // Every agent should appear exactly once across all pairings
    const ids = result.flatMap((p) => [p.agentAId, p.agentBId]);
    expect(new Set(ids).size).toBe(4);
  });

  it('handles an odd number of agents (one sits out)', () => {
    const agents = [
      agent('1', 'Alice', ['cooking'], 'gentle'),
      agent('2', 'Bob', ['travel'], 'adventurous'),
      agent('3', 'Carol', ['music'], 'artistic'),
    ];

    const result = createPairings(agents);
    expect(result).toHaveLength(1);

    const ids = result.flatMap((p) => [p.agentAId, p.agentBId]);
    expect(ids).toHaveLength(2);
  });

  it('returns empty array with fewer than 2 agents', () => {
    expect(createPairings([])).toEqual([]);
    expect(createPairings([agent('1', 'Solo', [], 'quiet')])).toEqual([]);
  });

  it('respects usedPairs to avoid repeat matchups', () => {
    const agents = [
      agent('1', 'Alice', ['cooking'], 'gentle'),
      agent('2', 'Bob', ['cooking'], 'gentle'),
    ];

    const usedPairs = new Set<string>();
    const first = createPairings(agents, usedPairs);
    expect(first).toHaveLength(1);

    // The pair is now used, so a second call should yield nothing
    const second = createPairings(agents, usedPairs);
    expect(second).toHaveLength(0);
  });

  it('returns results with expected shape', () => {
    const agents = [
      agent('1', 'Alice', ['cooking'], 'gentle'),
      agent('2', 'Bob', ['travel'], 'adventurous'),
    ];

    const result = createPairings(agents);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('agentAId');
    expect(result[0]).toHaveProperty('agentBId');
    expect(result[0]).toHaveProperty('compatibilityScore');
    expect(result[0]).toHaveProperty('reasoning');
    expect(typeof result[0].compatibilityScore).toBe('number');
    expect(result[0].compatibilityScore).toBeGreaterThanOrEqual(0);
    expect(result[0].compatibilityScore).toBeLessThanOrEqual(100);
  });

  it('gives higher scores to agents with overlapping interests', () => {
    const shared = agent('1', 'Alice', ['cooking', 'travel', 'music'], 'gentle');
    const alsoShared = agent('2', 'Bob', ['cooking', 'travel', 'music'], 'gentle');
    const different = agent('3', 'Carol', ['coding', 'gaming', 'math'], 'rational');

    // Run multiple times to smooth out the random tiebreaker
    let sharedScore = 0;
    let differentScore = 0;
    const runs = 20;

    for (let i = 0; i < runs; i++) {
      const pairSame = createPairings([shared, alsoShared]);
      const pairDiff = createPairings([shared, different]);
      sharedScore += pairSame[0].compatibilityScore;
      differentScore += pairDiff[0].compatibilityScore;
    }

    expect(sharedScore / runs).toBeGreaterThan(differentScore / runs);
  });

  it('gives higher scores to agents with complementary personality types', () => {
    const romantic = agent('1', 'Alice', [], 'romantic');
    const gentle = agent('2', 'Bob', [], 'gentle');
    const unrelated = agent('3', 'Carol', [], 'xyzzy');

    // Romantic + gentle is a complementary pair defined in COMPLEMENTARY_PAIRS
    const complementary = createPairings([romantic, gentle]);
    const nonComplementary = createPairings([romantic, unrelated]);

    expect(complementary[0].compatibilityScore).toBeGreaterThan(
      nonComplementary[0].compatibilityScore,
    );
  });
});
