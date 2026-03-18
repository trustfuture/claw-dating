'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { Navbar } from '@/components/Navbar'
import { ScrollToTop } from '@/components/ScrollToTop'

interface Award {
  title: string
  emoji: string
  winners: string[]
  score: number
  subtitle?: string
}

interface MatchResult {
  agentA: string
  agentB: string
  avgScore: number
  emojiA: string
  emojiB: string
  compatibilityScore?: number
  reasoning?: string
}

interface AgentStat {
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

interface ScoreboardEvent {
  dates?: EventDate[]
  agentStats?: EventAgentStat[]
}

export default function ScoreboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-purple/20 border-t-purple rounded-full" />
      </div>
    }>
      <ScoreboardContent />
    </Suspense>
  )
}

interface HistoryLeaderEntry {
  id: string
  name: string
  avatarEmoji: string
  totalDates: number
  totalEvents: number
  avgRatingGiven: number
  avgRatingReceived: number
  avgCompatibility: number
}

interface HistoryEvent {
  id: string
  name: string
  phase: string
  createdAt: string
  participantCount: number
  totalDates: number
  completedDates: number
}

function ScoreboardContent() {
  const { user, loading } = useAuth()
  const { t } = useLocale()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('eventId')
  const [awards, setAwards] = useState<Award[]>([])
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [agentStats, setAgentStats] = useState<AgentStat[]>([])
  const [eventName, setEventName] = useState<string>('')
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [search, setSearch] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [historyLeaderboard, setHistoryLeaderboard] = useState<HistoryLeaderEntry[]>([])
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)

  useEffect(() => {
    if (!loading && !user) window.location.href = '/'
  }, [loading, user])

  useEffect(() => {
    const url = eventId ? `/api/events/${eventId}` : '/api/events'
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.event) {
          setEventName(data.event.name || '')
          computeResults(data.event as ScoreboardEvent)
        }
      })
      .catch(() => {})
  }, [eventId])

  // Trigger staggered reveal after results computed
  useEffect(() => {
    if (awards.length > 0 || matches.length > 0) {
      const timer = setTimeout(() => setRevealed(true), 100)
      return () => clearTimeout(timer)
    }
  }, [awards, matches])

  // Fetch history data when toggled
  useEffect(() => {
    if (showHistory && !historyLoaded) {
      fetch('/api/events/history')
        .then((r) => r.json())
        .then((data) => {
          setHistoryLeaderboard(data.leaderboard || [])
          setHistoryEvents(data.events || [])
          setHistoryLoaded(true)
        })
        .catch(() => {})
    }
  }, [showHistory, historyLoaded])

  const computeResults = (evt: ScoreboardEvent) => {
    const dates = evt.dates || []
    const computedAwards: Award[] = []
    const computedMatches: MatchResult[] = []

    type AgentDataEntry = {
      id: string
      name: string
      emoji: string
      totalDates: number
      givenScores: number[]
      receivedScores: number[]
      compatibilities: number[]
    }

    // Per-agent tracking
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

    // Track for new awards
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

      // Mutual rating (min of both sides) - keyed by stable agent ids
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

      // Track individual scores by stable ids:
      // giver = rating.agentId, receiver = the other side in this pairing
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

    // Award: Best Chemistry (highest mutual rating)
    if (highestMutualPair) {
      computedAwards.push({
        title: '最高默契奖',
        emoji: '🔥',
        winners: [highestMutualPair.a, highestMutualPair.b],
        score: highestMutualRating,
        subtitle: '双方最低分最高的一对',
      })
    }

    // Award: Social Butterfly (most dates)
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

    // Award: Sweet Talker (highest single rating received)
    if (sweetTalkerId && highestSingleRating > 0 && agentData[sweetTalkerId]) {
      computedAwards.push({
        title: '甜言蜜语奖',
        emoji: '🍯',
        winners: [agentData[sweetTalkerId].name],
        score: highestSingleRating,
        subtitle: '收到的最高单次评分',
      })
    }

    // Award: Hidden Gem (high compatibility but underrated - high compat, lower avg received score)
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

    // Also use API agentStats if available
    if (evt.agentStats && Array.isArray(evt.agentStats)) {
      // Merge API stats with computed stats
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

    setAwards(computedAwards)
    setMatches(computedMatches.sort((a, b) => b.avgScore - a.avgScore))
    setAgentStats(stats.sort((a, b) => b.avgRatingReceived - a.avgRatingReceived))
  }

  const q = search.trim().toLowerCase()
  const filteredMatches = q
    ? matches.filter((m) =>
        m.agentA.toLowerCase().includes(q) ||
        m.agentB.toLowerCase().includes(q) ||
        (m.reasoning || '').toLowerCase().includes(q)
      )
    : matches
  const filteredStats = q
    ? agentStats.filter((s) => s.name.toLowerCase().includes(q))
    : agentStats

  // Podium: top 3 matches (only when not searching)
  const podiumMatches = q ? [] : matches.slice(0, 3)

  const podiumConfig = [
    { gradient: 'from-yellow-50 to-yellow-100/50', border: 'border-yellow-200', label: '🥇', textColor: 'text-yellow-600' },
    { gradient: 'from-gray-50 to-gray-100/50', border: 'border-gray-200', label: '🥈', textColor: 'text-gray-500' },
    { gradient: 'from-orange-50 to-orange-100/50', border: 'border-orange-200', label: '🥉', textColor: 'text-orange-500' },
  ]

  return (
    <div className="min-h-screen">
      <Navbar />

      <main id="main-content" className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="text-center mb-8 sm:mb-10">
          {eventId && (
            <a
              href="/lobby"
              className="inline-flex items-center gap-1 text-sm text-secondary hover:text-purple transition-colors mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              返回大厅
            </a>
          )}
          <div className="text-4xl sm:text-5xl mb-3">🏆</div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">{t('scoreboard.title')}</h1>
          <p className="text-secondary text-sm mt-1">
            {eventName ? `${eventName} - 结果揭晓` : '相亲大会结果揭晓'}
          </p>
          {matches.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <button
                onClick={() => {
                  const lines = ['🦞 龙虾相亲大会 - 排行榜 🏆', '']
                  if (awards.length > 0) {
                    lines.push('--- 颁奖典礼 ---')
                    awards.forEach((a) => {
                      lines.push(`${a.emoji} ${a.title}: ${a.winners.join(' & ')} (${a.score})`)
                    })
                    lines.push('')
                  }
                  lines.push('--- 约会排名 ---')
                  matches.slice(0, 5).forEach((m, i) => {
                    lines.push(`${i + 1}. ${m.emojiA} ${m.agentA} ❤ ${m.agentB} ${m.emojiB} - ${m.avgScore}/10`)
                  })
                  if (matches.length > 5) lines.push(`...共 ${matches.length} 对`)
                  lines.push('', '#龙虾相亲大会 #ClawDating')
                  navigator.clipboard.writeText(lines.join('\n')).then(() => {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  })
                }}
                className="px-5 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] text-secondary hover:bg-purple/5 hover:border-purple/20 transition-all"
              >
                {copied ? t('scoreboard.copied') : t('scoreboard.copy')}
              </button>
              <button
                onClick={() => {
                  if (matches.length === 0) return
                  const headers = ['排名', '嘉宾A', '嘉宾B', '平均分', '匹配度']
                  const rows = matches.map((m, i) => [
                    i + 1,
                    m.agentA,
                    m.agentB,
                    m.avgScore,
                    m.compatibilityScore ?? '',
                  ])
                  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
                  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `claw-dating-${eventName || 'results'}.csv`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="px-5 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] text-secondary hover:bg-purple/5 hover:border-purple/20 transition-all"
              >
                {t('scoreboard.export')}
              </button>
              {typeof navigator !== 'undefined' && navigator.share && (
                <button
                  onClick={() => {
                    const text = matches.slice(0, 3).map((m, i) =>
                      `${i + 1}. ${m.emojiA}${m.agentA} ❤ ${m.agentB}${m.emojiB} ${m.avgScore}/10`
                    ).join('\n')
                    navigator.share({
                      title: '🦞 龙虾相亲大会排行榜',
                      text: `🦞 龙虾相亲大会 🏆\n${text}\n#ClawDating`,
                    }).catch(() => {})
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple to-[#6c3fc4] shadow-md transition-all"
                >
                  {t('scoreboard.share')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Search */}
        {matches.length > 0 && (
          <div className="mb-6">
            <div className="relative max-w-md mx-auto">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('scoreboard.search')}
                aria-label="搜索排行榜"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-purple/20 focus:border-purple/30 transition-all"
              />
            </div>
          </div>
        )}

        {/* Awards */}
        {awards.length > 0 && !q && (
          <section className="mb-8 sm:mb-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {awards.map((award, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-[var(--border)] p-5 sm:p-6 text-center shadow-sm transition-all duration-500"
                  style={{
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? 'translateY(0)' : 'translateY(20px)',
                    transitionDelay: `${i * 120}ms`,
                  }}
                >
                  <div className="text-3xl sm:text-4xl mb-2">{award.emoji}</div>
                  <div className="text-xs font-semibold text-gold uppercase tracking-wider mb-2">
                    {award.title}
                  </div>
                  <div className="text-sm sm:text-base font-bold truncate px-1">
                    {award.winners.join(' & ')}
                  </div>
                  <div className="text-xl sm:text-2xl font-display font-bold text-coral mt-1">
                    {award.score}
                  </div>
                  {award.subtitle && (
                    <div className="text-[10px] sm:text-xs text-muted mt-1">{award.subtitle}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Podium - Top 3 */}
        {podiumMatches.length > 0 && (
          <section className="mb-8 sm:mb-10">
            <h2 className="font-display text-lg sm:text-xl font-bold mb-4">{t('scoreboard.bestMatch')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {podiumMatches.map((m, i) => (
                <div
                  key={i}
                  className={`bg-gradient-to-br ${podiumConfig[i]?.gradient || ''} rounded-2xl border ${podiumConfig[i]?.border || 'border-[var(--border)]'} p-4 sm:p-5 text-center transition-all duration-500`}
                  style={{
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? 'scale(1)' : 'scale(0.9)',
                    transitionDelay: `${(awards.length + i) * 120}ms`,
                  }}
                >
                  <div className="text-2xl sm:text-3xl mb-1">{podiumConfig[i]?.label}</div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-xl sm:text-2xl">{m.emojiA}</span>
                    <span className="text-coral">&hearts;</span>
                    <span className="text-xl sm:text-2xl">{m.emojiB}</span>
                  </div>
                  <div className="text-xs sm:text-sm font-semibold truncate">{m.agentA}</div>
                  <div className="text-[10px] sm:text-xs text-muted">&</div>
                  <div className="text-xs sm:text-sm font-semibold truncate">{m.agentB}</div>
                  <div className="mt-2">
                    <span className="text-xl sm:text-2xl font-display font-bold text-coral">{m.avgScore}</span>
                    <span className="text-[10px] text-muted">/10</span>
                  </div>
                  {(m.compatibilityScore ?? 0) > 0 && (
                    <div className="text-[10px] sm:text-xs text-muted mt-1">
                      匹配度 {m.compatibilityScore}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Remaining Match Results */}
        <section className="mb-8 sm:mb-10">
          <h2 className="font-display text-lg sm:text-xl font-bold mb-4">{t('scoreboard.dateRanking')}</h2>
          {filteredMatches.length === 0 ? (
            <div className="text-center py-16 text-muted">
              {q ? (
                <p>没有找到匹配的结果</p>
              ) : (
                <>
                  <p>暂无结果，约会完成后这里会显示排名</p>
                  <Link href="/dates" className="text-purple text-sm font-medium mt-2 inline-block">
                    前往约会 &rarr;
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {filteredMatches.map((m, i) => (
                <div
                  key={i}
                  className={`bg-white rounded-xl border border-[var(--border)] px-3 sm:px-5 py-3 sm:py-4 transition-all duration-500 ${
                    i < 3 ? 'ring-1 ring-gold/20' : ''
                  }`}
                  style={{
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? 'translateX(0)' : 'translateX(-20px)',
                    transitionDelay: `${(awards.length + podiumMatches.length + i) * 80}ms`,
                  }}
                >
                  <div className="flex items-center gap-2 sm:gap-4">
                    <span className={`text-sm sm:text-lg font-display font-bold w-6 sm:w-8 text-center flex-shrink-0 ${
                      i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-muted'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="text-lg sm:text-2xl flex-shrink-0">{m.emojiA}</span>
                    <span className="text-xs sm:text-sm font-semibold flex-1 truncate min-w-0">{m.agentA}</span>
                    <span className="text-coral flex-shrink-0">&hearts;</span>
                    <span className="text-xs sm:text-sm font-semibold flex-1 text-right truncate min-w-0">{m.agentB}</span>
                    <span className="text-lg sm:text-2xl flex-shrink-0">{m.emojiB}</span>
                    <div className="w-14 sm:w-20 text-right flex-shrink-0">
                      <span className="text-base sm:text-xl font-display font-bold text-coral">{m.avgScore}</span>
                      <span className="text-[10px] text-muted">/10</span>
                      {(m.compatibilityScore ?? 0) > 0 && (
                        <div className="text-[9px] sm:text-[10px] text-muted">
                          匹配{m.compatibilityScore}%
                        </div>
                      )}
                    </div>
                  </div>
                  {m.reasoning && (
                    <div className="ml-8 sm:ml-12 mt-1.5 text-[11px] text-secondary/70 line-clamp-1">
                      {m.reasoning}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Personal Stats */}
        {filteredStats.length > 0 && (
          <section>
            <h2 className="font-display text-lg sm:text-xl font-bold mb-4">{t('scoreboard.personalStats')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredStats.map((stat, i) => (
                <div
                  key={stat.id || stat.name}
                  className="bg-white rounded-2xl border border-[var(--border)] p-4 sm:p-5 shadow-sm transition-all duration-500 hover:shadow-md hover:-translate-y-0.5"
                  style={{
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(10px)',
                    transitionDelay: `${(awards.length + podiumMatches.length + matches.length) * 80 + i * 100}ms`,
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl sm:text-3xl">{stat.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{stat.name}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-lg sm:text-xl font-display font-bold text-purple">{stat.totalDates}</div>
                      <div className="text-[10px] sm:text-xs text-muted">约会数</div>
                    </div>
                    <div>
                      <div className="text-lg sm:text-xl font-display font-bold text-coral">{stat.avgRatingReceived || '-'}</div>
                      <div className="text-[10px] sm:text-xs text-muted">平均得分</div>
                    </div>
                    <div>
                      <div className="text-lg sm:text-xl font-display font-bold text-teal">
                        {stat.highestCompatibility > 0 ? `${stat.highestCompatibility}%` : '-'}
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted">最高匹配</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* History toggle */}
        <section className="mt-8 sm:mt-10">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm font-semibold text-secondary hover:text-purple transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            历史统计（跨活动）
          </button>

          {showHistory && (
            <div className="mt-4 space-y-6">
              {/* History events list */}
              {historyEvents.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-secondary mb-3">历史活动</h3>
                  <div className="space-y-2">
                    {historyEvents.map((evt) => (
                      <Link
                        key={evt.id}
                        href={`/scoreboard?eventId=${evt.id}`}
                        className="block bg-white rounded-xl border border-[var(--border)] px-4 py-3 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold">{evt.name}</div>
                            <div className="text-[10px] text-muted mt-0.5">
                              {evt.participantCount} 参与者 · {evt.completedDates}/{evt.totalDates} 场完成 · {new Date(evt.createdAt).toLocaleDateString('zh-CN')}
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            evt.phase === 'results' ? 'bg-teal/10 text-teal' : 'bg-purple/10 text-purple'
                          }`}>
                            {evt.phase}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Cross-event leaderboard */}
              {historyLeaderboard.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-secondary mb-3">全局排行榜</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {historyLeaderboard.map((entry, i) => (
                      <div
                        key={entry.id}
                        className="bg-white rounded-2xl border border-[var(--border)] p-4 shadow-sm"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-sm font-display font-bold text-muted w-6 text-center">
                            {i + 1}
                          </span>
                          <span className="text-2xl">{entry.avatarEmoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold truncate">{entry.name}</div>
                            <div className="text-[10px] text-muted">
                              {entry.totalEvents} 场活动 · {entry.totalDates} 次约会
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-lg font-display font-bold text-coral">{entry.avgRatingReceived || '-'}</div>
                            <div className="text-[10px] text-muted">平均得分</div>
                          </div>
                          <div>
                            <div className="text-lg font-display font-bold text-purple">{entry.avgRatingGiven || '-'}</div>
                            <div className="text-[10px] text-muted">给出评分</div>
                          </div>
                          <div>
                            <div className="text-lg font-display font-bold text-teal">
                              {entry.avgCompatibility > 0 ? `${entry.avgCompatibility}%` : '-'}
                            </div>
                            <div className="text-[10px] text-muted">平均匹配</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {historyLeaderboard.length === 0 && historyLoaded && (
                <p className="text-muted text-sm text-center py-6">暂无历史数据</p>
              )}

              {!historyLoaded && (
                <div className="flex justify-center py-6">
                  <div className="animate-spin w-6 h-6 border-2 border-purple/20 border-t-purple rounded-full" />
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <ScrollToTop />
    </div>
  )
}
