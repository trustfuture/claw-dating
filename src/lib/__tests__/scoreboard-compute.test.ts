import { computeScoreboardResults, type ScoreboardEvent } from '../scoreboard-compute';

function makeEvent(dates: ScoreboardEvent['dates'] = []): ScoreboardEvent {
  return { dates }
}

function makeDate(
  agentA: { id: string; name: string; avatarEmoji?: string },
  agentB: { id: string; name: string; avatarEmoji?: string },
  ratings: { agentId: string; score: number }[],
  compat = 0,
) {
  return {
    pairing: {
      agentA: { id: agentA.id, name: agentA.name, avatarEmoji: agentA.avatarEmoji || '🦞' },
      agentB: { id: agentB.id, name: agentB.name, avatarEmoji: agentB.avatarEmoji || '🦊' },
      compatibilityScore: compat,
    },
    ratings,
  }
}

describe('computeScoreboardResults', () => {
  it('returns empty results for empty event', () => {
    const result = computeScoreboardResults(makeEvent())
    expect(result.awards).toEqual([])
    expect(result.matches).toEqual([])
    expect(result.agentStats).toEqual([])
  });

  it('computes match results from date ratings', () => {
    const event = makeEvent([
      makeDate(
        { id: 'a1', name: 'Alice' },
        { id: 'a2', name: 'Bob' },
        [{ agentId: 'a1', score: 8 }, { agentId: 'a2', score: 9 }],
      ),
    ])
    const result = computeScoreboardResults(event)
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0].avgScore).toBe(8.5)
    expect(result.matches[0].agentA).toBe('Alice')
    expect(result.matches[0].agentB).toBe('Bob')
  });

  it('generates Best Couple award', () => {
    const event = makeEvent([
      makeDate(
        { id: 'a1', name: 'Alice' },
        { id: 'a2', name: 'Bob' },
        [{ agentId: 'a1', score: 9 }, { agentId: 'a2', score: 10 }],
      ),
    ])
    const result = computeScoreboardResults(event)
    const bestCouple = result.awards.find(a => a.title === '最佳情侣')
    expect(bestCouple).toBeDefined()
    expect(bestCouple!.winners).toContain('Alice')
    expect(bestCouple!.winners).toContain('Bob')
  });

  it('generates Most Popular award', () => {
    const event = makeEvent([
      makeDate(
        { id: 'a1', name: 'Alice' },
        { id: 'a2', name: 'Bob' },
        [{ agentId: 'a1', score: 9 }, { agentId: 'a2', score: 7 }],
      ),
      makeDate(
        { id: 'a1', name: 'Alice' },
        { id: 'a3', name: 'Charlie' },
        [{ agentId: 'a1', score: 8 }, { agentId: 'a3', score: 6 }],
      ),
    ])
    const result = computeScoreboardResults(event)
    const popular = result.awards.find(a => a.title === '万人迷')
    expect(popular).toBeDefined()
    // Alice received 7 + 6 = 13 from 2 dates = 6.5 avg
    // Bob received 9 from 1 date = 9 avg → Bob is most popular
    expect(popular!.winners).toContain('Bob')
  });

  it('generates Social Butterfly award', () => {
    const event = makeEvent([
      makeDate({ id: 'a1', name: 'Alice' }, { id: 'a2', name: 'Bob' }, []),
      makeDate({ id: 'a1', name: 'Alice' }, { id: 'a3', name: 'Charlie' }, []),
    ])
    const result = computeScoreboardResults(event)
    const butterfly = result.awards.find(a => a.title === '社交达人')
    expect(butterfly).toBeDefined()
    expect(butterfly!.winners).toContain('Alice')
    expect(butterfly!.score).toBe(2)
  });

  it('sorts matches by average score descending', () => {
    const event = makeEvent([
      makeDate(
        { id: 'a1', name: 'Alice' },
        { id: 'a2', name: 'Bob' },
        [{ agentId: 'a1', score: 5 }, { agentId: 'a2', score: 5 }],
      ),
      makeDate(
        { id: 'a3', name: 'Charlie' },
        { id: 'a4', name: 'Diana' },
        [{ agentId: 'a3', score: 9 }, { agentId: 'a4', score: 9 }],
      ),
    ])
    const result = computeScoreboardResults(event)
    expect(result.matches[0].agentA).toBe('Charlie')
    expect(result.matches[1].agentA).toBe('Alice')
  });

  it('computes agent stats correctly', () => {
    const event = makeEvent([
      makeDate(
        { id: 'a1', name: 'Alice' },
        { id: 'a2', name: 'Bob' },
        [{ agentId: 'a1', score: 8 }, { agentId: 'a2', score: 6 }],
        75,
      ),
    ])
    const result = computeScoreboardResults(event)
    const alice = result.agentStats.find(s => s.name === 'Alice')
    expect(alice).toBeDefined()
    expect(alice!.totalDates).toBe(1)
    expect(alice!.highestCompatibility).toBe(75)
  });

  it('skips dates with fewer than 2 ratings for match results', () => {
    const event = makeEvent([
      makeDate(
        { id: 'a1', name: 'Alice' },
        { id: 'a2', name: 'Bob' },
        [{ agentId: 'a1', score: 8 }], // Only 1 rating
      ),
    ])
    const result = computeScoreboardResults(event)
    expect(result.matches).toHaveLength(0)
  });

  it('merges API agentStats for unknown agents', () => {
    const event: ScoreboardEvent = {
      dates: [],
      agentStats: [
        { id: 'x1', name: 'External', emoji: '🤖', totalDates: 5, avgRatingReceived: 7.5 },
      ],
    }
    const result = computeScoreboardResults(event)
    const ext = result.agentStats.find(s => s.id === 'x1')
    expect(ext).toBeDefined()
    expect(ext!.name).toBe('External')
    expect(ext!.totalDates).toBe(5)
  });
});
