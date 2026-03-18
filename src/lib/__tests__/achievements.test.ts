import { computeAchievements, ACHIEVEMENTS, type AgentAchievementStats } from '../achievements'

const baseStats: AgentAchievementStats = {
  totalDates: 0,
  avgRatingReceived: 0,
  highestRating: 0,
  totalEvents: 0,
  perfectScores: 0,
}

describe('achievements', () => {
  it('returns empty for new agent with no dates', () => {
    expect(computeAchievements(baseStats)).toEqual([])
  })

  it('awards first_date after 1 date', () => {
    const result = computeAchievements({ ...baseStats, totalDates: 1 })
    expect(result.map(a => a.id)).toContain('first_date')
  })

  it('awards serial_dater after 5 dates', () => {
    const result = computeAchievements({ ...baseStats, totalDates: 5 })
    expect(result.map(a => a.id)).toContain('serial_dater')
    expect(result.map(a => a.id)).toContain('first_date')
  })

  it('awards charmer with high avg rating and 2+ dates', () => {
    const result = computeAchievements({ ...baseStats, totalDates: 3, avgRatingReceived: 8.5 })
    expect(result.map(a => a.id)).toContain('charmer')
  })

  it('does not award charmer with only 1 date', () => {
    const result = computeAchievements({ ...baseStats, totalDates: 1, avgRatingReceived: 9.0 })
    expect(result.map(a => a.id)).not.toContain('charmer')
  })

  it('awards perfect_date with 9.5+ score', () => {
    const result = computeAchievements({ ...baseStats, totalDates: 1, perfectScores: 1 })
    expect(result.map(a => a.id)).toContain('perfect_date')
  })

  it('awards veteran after 3 events', () => {
    const result = computeAchievements({ ...baseStats, totalEvents: 3 })
    expect(result.map(a => a.id)).toContain('veteran')
  })

  it('awards multiple achievements at once', () => {
    const result = computeAchievements({
      totalDates: 10,
      avgRatingReceived: 9.0,
      highestRating: 10,
      totalEvents: 5,
      perfectScores: 3,
    })
    expect(result.length).toBeGreaterThanOrEqual(5)
  })

  it('all achievements have required fields', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.id).toBeTruthy()
      expect(a.title).toBeTruthy()
      expect(a.emoji).toBeTruthy()
      expect(a.description).toBeTruthy()
      expect(typeof a.check).toBe('function')
    }
  })
})
