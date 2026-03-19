/**
 * Pure computation for scoreboard results.
 * Extracted from scoreboard page for testability.
 */

export interface Award {
  title: string
  emoji: string
  winners: string[]
  score: number
  subtitle?: string
}

export interface MatchResult {
  agentA: string
  agentB: string
  avgScore: number
  emojiA: string
  emojiB: string
  compatibilityScore?: number
  reasoning?: string
}

export interface AgentStat {
  id: string
  name: string
  emoji: string
  totalDates: number
  avgRatingGiven: number
  avgRatingReceived: number
  highestCompatibility: number
}

interface EventAgent {
  id: string
  name: string
  avatarEmoji: string
}

interface EventRating {
  agentId: string
  score: number
}

interface EventPairing {
  agentA: EventAgent
  agentB: EventAgent
  compatibilityScore?: number
  reasoning?: string
}

interface EventDate {
  pairing?: EventPairing & { reasoning?: string }
  ratings?: EventRating[]
}

interface EventAgentStat {
  id?: string
  name?: string
  emoji?: string
  avatarEmoji?: string
  totalDates?: number
  avgRatingGiven?: number
  avgRatingReceived?: number
  highestCompatibility?: number
}

export interface ScoreboardEvent {
  dates?: EventDate[]
  agentStats?: EventAgentStat[]
}

export interface ComputedResults {
  awards: Award[]
  matches: MatchResult[]
  agentStats: AgentStat[]
}

type AgentDataEntry = {
  id: string
  name: string
  emoji: string
  totalDates: number
  givenScores: number[]
  receivedScores: number[]
  compatibilities: number[]
}

export function computeScoreboardResults(evt: ScoreboardEvent): ComputedResults {
  const dates = evt.dates || []
  const computedAwards: Award[] = []
  const computedMatches: MatchResult[] = []

  const agentData: Record<string, AgentDataEntry> = {}

  const ensureAgent = (id: string, name: string, emoji: string) => {
    if (!agentData[id]) {
      agentData[id] = { id, name, emoji, totalDates: 0, givenScores: [], receivedScores: [], compatibilities: [] }
    }
    if (!agentData[id].name && name) agentData[id].name = name
    if ((agentData[id].emoji === '🦞' || !agentData[id].emoji) && emoji) {
      agentData[id].emoji = emoji
    }
  }

  let bestScore = 0
  let bestCouple: EventPairing | null = null
  let highestMutualRating = 0
  let highestMutualPair: { a: string; b: string } | null = null
  let highestSingleRating = 0
  let sweetTalkerId = ''

  for (const date of dates) {
    const aId = date.pairing?.agentA?.id
    const aName = date.pairing?.agentA?.name ?? '神秘嘉宾'
    const bId = date.pairing?.agentB?.id
    const bName = date.pairing?.agentB?.name ?? '神秘嘉宾'
    const aEmoji = date.pairing?.agentA?.avatarEmoji || '🦞'
    const bEmoji = date.pairing?.agentB?.avatarEmoji || '🦞'
    const compat = date.pairing?.compatibilityScore || 0

    if (aId) {
      ensureAgent(aId, aName, aEmoji)
      agentData[aId].totalDates++
      if (compat > 0) agentData[aId].compatibilities.push(compat)
    }
    if (bId) {
      ensureAgent(bId, bName, bEmoji)
      agentData[bId].totalDates++
      if (compat > 0) agentData[bId].compatibilities.push(compat)
    }

    if (!date.ratings || date.ratings.length < 2) continue
    const avg = date.ratings.reduce((sum, rating) => sum + rating.score, 0) / date.ratings.length

    computedMatches.push({
      agentA: aName,
      agentB: bName,
      emojiA: aEmoji,
      emojiB: bEmoji,
      avgScore: Math.round(avg * 10) / 10,
      compatibilityScore: compat,
      reasoning: date.pairing?.reasoning,
    })

    if (avg > bestScore && date.pairing) {
      bestScore = avg
      bestCouple = date.pairing
    }

    const ratingByAgentId = new Map<string, number>()
    for (const rating of date.ratings) {
      if (rating?.agentId) {
        ratingByAgentId.set(rating.agentId, Number(rating.score) || 0)
      }
    }

    if (aId && bId && ratingByAgentId.has(aId) && ratingByAgentId.has(bId)) {
      const mutualMin = Math.min(
        ratingByAgentId.get(aId) || 0,
        ratingByAgentId.get(bId) || 0,
      )
      if (mutualMin > highestMutualRating) {
        highestMutualRating = mutualMin
        highestMutualPair = { a: aName, b: bName }
      }
    }

    for (const rating of date.ratings) {
      const giverId = rating?.agentId
      if (!giverId || !agentData[giverId] || !aId || !bId) continue

      const receiverId = giverId === aId ? bId : giverId === bId ? aId : ''
      if (!receiverId || !agentData[receiverId]) continue

      const score = Number(rating.score) || 0
      agentData[giverId].givenScores.push(score)
      agentData[receiverId].receivedScores.push(score)

      if (score > highestSingleRating) {
        highestSingleRating = score
        sweetTalkerId = receiverId
      }
    }
  }

  // Award: Best Couple
  if (bestCouple) {
    computedAwards.push({
      title: '最佳情侣',
      emoji: '💕',
      winners: [bestCouple.agentA.name, bestCouple.agentB.name],
      score: Math.round(bestScore * 10) / 10,
    })
  }

  // Award: Most Popular
  const received: Record<string, { total: number; count: number; name: string }> = {}
  for (const date of dates) {
    const aId = date.pairing?.agentA?.id
    const aName = date.pairing?.agentA?.name ?? '神秘嘉宾'
    const bId = date.pairing?.agentB?.id
    const bName = date.pairing?.agentB?.name ?? '神秘嘉宾'
    if (!date.ratings || date.ratings.length < 2 || !aId || !bId) continue

    for (const rating of date.ratings) {
      const giverId = rating?.agentId
      const receiverId = giverId === aId ? bId : giverId === bId ? aId : ''
      if (!receiverId) continue

      const receiverName = receiverId === aId ? aName : bName
      if (!received[receiverId]) received[receiverId] = { total: 0, count: 0, name: receiverName }
      received[receiverId].total += Number(rating.score) || 0
      received[receiverId].count++
    }
  }
  const popular = Object.values(received).sort((a, b) => b.total / b.count - a.total / a.count)[0]
  if (popular) {
    computedAwards.push({
      title: '万人迷',
      emoji: '🤩',
      winners: [popular.name],
      score: Math.round((popular.total / popular.count) * 10) / 10,
    })
  }

  // Award: Best Chemistry
  if (highestMutualPair) {
    computedAwards.push({
      title: '最高默契奖',
      emoji: '🔥',
      winners: [highestMutualPair.a, highestMutualPair.b],
      score: highestMutualRating,
      subtitle: '双方最低分最高的一对',
    })
  }

  // Award: Social Butterfly
  const mostDates = Object.values(agentData).sort((a, b) => b.totalDates - a.totalDates)[0]
  if (mostDates && mostDates.totalDates > 0) {
    computedAwards.push({
      title: '社交达人',
      emoji: '🦋',
      winners: [mostDates.name],
      score: mostDates.totalDates,
      subtitle: `参加了 ${mostDates.totalDates} 场约会`,
    })
  }

  // Award: Sweet Talker
  if (sweetTalkerId && highestSingleRating > 0 && agentData[sweetTalkerId]) {
    computedAwards.push({
      title: '甜言蜜语奖',
      emoji: '🍯',
      winners: [agentData[sweetTalkerId].name],
      score: highestSingleRating,
      subtitle: '收到的最高单次评分',
    })
  }

  // Award: Hidden Gem
  const hiddenGemCandidates = Object.values(agentData)
    .filter((a) => a.compatibilities.length > 0 && a.receivedScores.length > 0)
    .map((a) => ({
      name: a.name,
      avgCompat: a.compatibilities.reduce((s, v) => s + v, 0) / a.compatibilities.length,
      avgReceived: a.receivedScores.reduce((s, v) => s + v, 0) / a.receivedScores.length,
    }))
    .sort((a, b) => (b.avgCompat - b.avgReceived) - (a.avgCompat - a.avgReceived))

  if (hiddenGemCandidates.length > 0 && hiddenGemCandidates[0].avgCompat > 50) {
    const gem = hiddenGemCandidates[0]
    computedAwards.push({
      title: '潜力股',
      emoji: '💎',
      winners: [gem.name],
      score: Math.round(gem.avgCompat),
      subtitle: `匹配度 ${Math.round(gem.avgCompat)}%，值得深入了解`,
    })
  }

  // Build agent stats
  const stats: AgentStat[] = Object.values(agentData).map((a) => ({
    id: a.id,
    name: a.name,
    emoji: a.emoji,
    totalDates: a.totalDates,
    avgRatingGiven: a.givenScores.length > 0
      ? Math.round((a.givenScores.reduce((s, v) => s + v, 0) / a.givenScores.length) * 10) / 10
      : 0,
    avgRatingReceived: a.receivedScores.length > 0
      ? Math.round((a.receivedScores.reduce((s, v) => s + v, 0) / a.receivedScores.length) * 10) / 10
      : 0,
    highestCompatibility: a.compatibilities.length > 0
      ? Math.max(...a.compatibilities)
      : 0,
  }))

  // Merge API agentStats if available
  if (evt.agentStats && Array.isArray(evt.agentStats)) {
    for (const apiStat of evt.agentStats) {
      const existing = stats.find((s) => s.id === apiStat.id)
      if (!existing) {
        stats.push({
          id: apiStat.id || '',
          name: apiStat.name || '',
          emoji: apiStat.emoji || apiStat.avatarEmoji || '🦞',
          totalDates: apiStat.totalDates || 0,
          avgRatingGiven: apiStat.avgRatingGiven || 0,
          avgRatingReceived: apiStat.avgRatingReceived || 0,
          highestCompatibility: apiStat.highestCompatibility || 0,
        })
      }
    }
  }

  return {
    awards: computedAwards,
    matches: computedMatches.sort((a, b) => b.avgScore - a.avgScore),
    agentStats: stats.sort((a, b) => b.avgRatingReceived - a.avgRatingReceived),
  }
}
