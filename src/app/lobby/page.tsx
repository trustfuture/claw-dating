'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/Navbar'
import { AgentCard } from '@/components/AgentCard'
import { CreateAgentForm } from '@/components/CreateAgentForm'

interface AgentData {
  id: string
  name: string
  avatarEmoji: string
  personalityType: string
  interests: string[]
  catchphrase: string
  status: string
  createdAt?: string
  user: { name: string; avatarUrl: string }
}

type SortMode = 'newest' | 'name'

interface EventSummary {
  id: string
  phase: string
  dates: Array<{ id: string }>
}

interface EventHistoryItem {
  id: string
  name: string
  phase: string
  currentRound: number
  totalRounds: number
  createdAt: string
  participantCount: number
  dateCount: number
}

export default function LobbyPage() {
  const { user, agent, loading, refresh } = useAuth()
  const [agents, setAgents] = useState<AgentData[]>([])
  const [event, setEvent] = useState<EventSummary | null>(null)
  const [starting, setStarting] = useState(false)
  const [agentsLoading, setAgentsLoading] = useState(true)
  const [agentsError, setAgentsError] = useState(false)

  // Search, filter, sort state
  const [search, setSearch] = useState('')
  const [activePersonalities, setActivePersonalities] = useState<Set<string>>(new Set())
  const [sortMode, setSortMode] = useState<SortMode>('newest')

  // Round selector
  const [totalRounds, setTotalRounds] = useState(2)

  // Event history
  const [eventHistory, setEventHistory] = useState<EventHistoryItem[]>([])
  const [creatingNewEvent, setCreatingNewEvent] = useState(false)

  // Confirm dialog
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/'
    }
  }, [loading, user])

  const fetchAgents = useCallback(() => {
    setAgentsLoading(true)
    setAgentsError(false)
    fetch('/api/agents')
      .then((r) => r.json())
      .then((data) => {
        setAgents(data.agents || [])
        setAgentsLoading(false)
      })
      .catch(() => {
        setAgentsError(true)
        setAgentsLoading(false)
      })
  }, [])

  const fetchEvent = useCallback(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((data) => setEvent((data.event ?? null) as EventSummary | null))
      .catch(() => {})
  }, [])

  const fetchEventHistory = useCallback(() => {
    fetch('/api/events?all=true')
      .then((r) => r.json())
      .then((data) => setEventHistory(data.events || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchAgents()
    fetchEvent()
    fetchEventHistory()
  }, [fetchAgents, fetchEvent, fetchEventHistory])

  const createNewEvent = async () => {
    setCreatingNewEvent(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `相亲大会 #${Date.now()}`, totalRounds }),
      })
      if (res.ok) {
        fetchEvent()
        fetchEventHistory()
      } else {
        const data = await res.json()
        window.alert(data.error || '创建活动失败')
      }
    } catch {
      window.alert('网络错误，请重试')
    } finally {
      setCreatingNewEvent(false)
    }
  }

  // Extract unique personality types
  const personalityTypes = useMemo(() => {
    const types = new Set<string>()
    agents.forEach((a) => {
      if (a.personalityType) types.add(a.personalityType)
    })
    return Array.from(types).sort()
  }, [agents])

  // Toggle personality filter
  const togglePersonality = (type: string) => {
    setActivePersonalities((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  // Clear all filters
  const clearFilters = () => {
    setSearch('')
    setActivePersonalities(new Set())
    setSortMode('newest')
  }

  // Filtered & sorted agents
  const filteredAgents = useMemo(() => {
    let result = [...agents]

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.personalityType || '').toLowerCase().includes(q) ||
          a.interests.some((i) => i.toLowerCase().includes(q)) ||
          (a.catchphrase || '').toLowerCase().includes(q)
      )
    }

    // Personality filter (OR logic)
    if (activePersonalities.size > 0) {
      result = result.filter((a) => activePersonalities.has(a.personalityType))
    }

    // Sort
    if (sortMode === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name, 'zh'))
    }
    // 'newest' = default API order (reverse for newest first if createdAt available)
    if (sortMode === 'newest' && result.some((a) => a.createdAt)) {
      result.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return db - da
      })
    }

    return result
  }, [agents, search, activePersonalities, sortMode])

  const isFiltering = search.trim() !== '' || activePersonalities.size > 0

  const startEvent = async () => {
    setShowConfirm(false)
    setStarting(true)
    try {
      // Create event if none exists
      let eventId = event?.id
      if (!eventId) {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: `相亲大会 #${Date.now()}`, totalRounds }),
        })
        const data = await res.json()
        eventId = data.event?.id
      }
      if (!eventId) {
        window.alert('创建活动失败，请重试')
        return
      }

      // Start the event
      const res = await fetch(`/api/events/${eventId}/start`, { method: 'POST' })
      if (res.ok) {
        window.location.href = '/dates'
      } else {
        window.alert('启动活动失败，请重试')
      }
    } catch {
      window.alert('网络错误，请重试')
    } finally {
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-purple/20 border-t-purple rounded-full" />
      </div>
    )
  }

  const hasStartedEvent = (event?.dates?.length ?? 0) > 0
  const primaryAction = hasStartedEvent
    ? event?.phase === 'results'
      ? {
          href: '/scoreboard',
          label: '查看排行榜',
          className: 'from-gold to-[#c49236] shadow-gold/20 hover:shadow-gold/30',
        }
      : {
          href: '/dates',
          label: '进入约会现场',
          className: 'from-teal to-[#1f8f8c] shadow-teal/20 hover:shadow-teal/30',
        }
    : null

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Create Agent */}
        {!agent && (
          <section className="mb-8 sm:mb-10">
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5 sm:p-8 shadow-sm">
              <h2 className="font-display text-xl sm:text-2xl font-bold mb-2">创建你的约会人格</h2>
              <p className="text-secondary text-xs sm:text-sm mb-4 sm:mb-6">
                你的 SecondMe AI 分身将以此人格参加速配约会
              </p>
              <CreateAgentForm
                onCreated={() => {
                  refresh()
                  fetchAgents()
                }}
              />
            </div>
          </section>
        )}

        {/* Agent Lobby */}
        <section>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold">
                嘉宾大厅
              </h2>
              <p className="text-secondary text-sm mt-1">
                {isFiltering
                  ? `共 ${filteredAgents.length} 位 Agent（筛选中）`
                  : `共 ${agents.length} 位 Agent`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Round selector - only show when can start */}
              {agent && agents.length >= 2 && !hasStartedEvent && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-secondary whitespace-nowrap">轮数</span>
                  <div className="flex rounded-xl border border-[var(--border)] overflow-hidden">
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        onClick={() => setTotalRounds(n)}
                        className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                          totalRounds === n
                            ? 'bg-purple text-white'
                            : 'bg-white text-secondary hover:bg-purple/5'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {agent && agents.length >= 2 && !hasStartedEvent && (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={starting}
                  className="
                    w-full sm:w-auto
                    px-8 py-3 rounded-2xl font-semibold text-white
                    bg-gradient-to-r from-coral to-[#c43a2f]
                    shadow-lg shadow-coral/25 hover:shadow-xl hover:shadow-coral/30
                    hover:-translate-y-0.5 active:translate-y-0
                    transition-all duration-200 disabled:opacity-50
                  "
                >
                  {starting ? '配对中...' : '开始相亲大会'}
                </button>
              )}
              {agent && agents.length >= 2 && primaryAction && (
                <a
                  href={primaryAction.href}
                  className={`
                    w-full sm:w-auto text-center
                    px-8 py-3 rounded-2xl font-semibold text-white
                    bg-gradient-to-r ${primaryAction.className}
                    shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0
                    transition-all duration-200
                  `}
                >
                  {primaryAction.label}
                </a>
              )}
            </div>
          </div>

          {/* Search & Filters */}
          <div className="space-y-3 mb-4 sm:mb-6">
            {/* Search bar */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索 Agent（名字、性格、兴趣...）"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-purple/20 focus:border-purple/30 transition-all"
              />
            </div>

            {/* Filter chips + sort */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              {personalityTypes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {personalityTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => togglePersonality(type)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        activePersonalities.has(type)
                          ? 'bg-purple text-white'
                          : 'bg-[var(--bg-elevated)] text-secondary hover:bg-purple/10'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}

              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-white text-xs text-secondary focus:outline-none focus:ring-2 focus:ring-purple/20 sm:ml-auto flex-shrink-0"
              >
                <option value="newest">最新加入</option>
                <option value="name">名字</option>
              </select>
            </div>
          </div>

          {/* Content: Loading / Error / Empty / Grid */}
          {agentsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-[var(--border)] p-4 sm:p-5 animate-pulse"
                >
                  <div className="flex items-start gap-3 sm:gap-4 mb-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                    </div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded w-full mb-3" />
                  <div className="flex gap-1.5">
                    <div className="h-5 bg-gray-100 rounded-full w-12" />
                    <div className="h-5 bg-gray-100 rounded-full w-16" />
                    <div className="h-5 bg-gray-100 rounded-full w-10" />
                  </div>
                </div>
              ))}
            </div>
          ) : agentsError ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">😵</div>
              <p className="text-secondary mb-4">加载失败，请检查网络后重试</p>
              <button
                onClick={fetchAgents}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple to-[#6c3fc4] shadow-md transition-all duration-200"
              >
                重试
              </button>
            </div>
          ) : filteredAgents.length === 0 && agents.length > 0 ? (
            <div className="text-center py-20 text-muted">
              <div className="text-5xl mb-4">🔍</div>
              <p className="mb-4">没有找到匹配的 Agent</p>
              <button
                onClick={clearFilters}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-purple border border-purple/20 hover:bg-purple/5 transition-all duration-200"
              >
                清除筛选条件
              </button>
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-20 text-muted">
              <div className="text-5xl mb-4">🦞</div>
              <p>还没有嘉宾入场，成为第一个吧！</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredAgents.map((a) => (
                <AgentCard key={a.id} agent={a} isMe={a.id === agent?.id} />
              ))}
            </div>
          )}
        </section>

        {/* New Event Button - show when current event is completed/results */}
        {agent && (event?.phase === 'results' || event?.phase === 'completed') && (
          <section className="mt-8 sm:mt-10">
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5 sm:p-6 shadow-sm text-center">
              <div className="text-3xl mb-2">🎉</div>
              <h3 className="font-display text-lg font-bold mb-1">本次活动已结束</h3>
              <p className="text-secondary text-sm mb-4">想再来一场吗？开启新的相亲大会！</p>
              <button
                onClick={createNewEvent}
                disabled={creatingNewEvent}
                className="
                  px-8 py-3 rounded-2xl font-semibold text-white
                  bg-gradient-to-r from-purple to-[#6c3fc4]
                  shadow-lg shadow-purple/25 hover:shadow-xl hover:shadow-purple/30
                  hover:-translate-y-0.5 active:translate-y-0
                  transition-all duration-200 disabled:opacity-50
                "
              >
                {creatingNewEvent ? '创建中...' : '开启新活动'}
              </button>
            </div>
          </section>
        )}

        {/* Event History */}
        {eventHistory.length > 1 && (
          <section className="mt-8 sm:mt-10">
            <h2 className="font-display text-xl sm:text-2xl font-bold mb-4">活动历史</h2>
            <div className="space-y-3">
              {eventHistory
                .filter((e) => e.id !== event?.id)
                .map((evt) => {
                  const phaseLabel: Record<string, string> = {
                    registration: '报名中',
                    dating: '约会中',
                    results: '已结束',
                    completed: '已结束',
                  }
                  const date = new Date(evt.createdAt)
                  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

                  return (
                    <a
                      key={evt.id}
                      href={`/scoreboard?eventId=${evt.id}`}
                      className="block bg-white rounded-xl border border-[var(--border)] px-4 sm:px-5 py-3 sm:py-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold truncate">{evt.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              evt.phase === 'results' || evt.phase === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : evt.phase === 'dating'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-600'
                            }`}>
                              {phaseLabel[evt.phase] || evt.phase}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted">
                            <span>{dateStr}</span>
                            <span>{evt.participantCount} 位嘉宾</span>
                            <span>{evt.dateCount} 场约会</span>
                            {evt.totalRounds > 0 && <span>{evt.totalRounds} 轮</span>}
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </a>
                  )
                })}
            </div>
          </section>
        )}
      </main>

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 sm:p-8">
            <div className="text-center">
              <div className="text-4xl mb-3">🦞</div>
              <h3 className="font-display text-lg font-bold mb-2">确定要开始吗？</h3>
              <p className="text-secondary text-sm mb-6">
                开始后不能再注册新 Agent。本次活动将进行 {totalRounds} 轮约会。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[var(--border)] text-secondary hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={startEvent}
                  disabled={starting}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-coral to-[#c43a2f] shadow-md shadow-coral/20 disabled:opacity-50 transition-all"
                >
                  {starting ? '配对中...' : '确定开始'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
