'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/Navbar'
import { AgentCard } from '@/components/AgentCard'
import { useToast } from '@/components/Toast'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { AgentSearchFilter } from '@/components/AgentSearchFilter'
import { EventControls } from '@/components/EventControls'
import { ScrollToTop } from '@/components/ScrollToTop'
import type { EventHistoryItem } from '@/components/EventHistory'

const CreateAgentForm = dynamic(() => import('@/components/CreateAgentForm').then(m => ({ default: m.CreateAgentForm })), { ssr: false })
const EventHistory = dynamic(() => import('@/components/EventHistory').then(m => ({ default: m.EventHistory })), { ssr: false })
const ChemistryHeatmap = dynamic(() => import('@/components/ChemistryHeatmap').then(m => ({ default: m.ChemistryHeatmap })), { ssr: false })

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

export default function LobbyPage() {
  const { user, agent, loading, refresh } = useAuth()
  const [agents, setAgents] = useState<AgentData[]>([])
  const [event, setEvent] = useState<EventSummary | null>(null)
  const [starting, setStarting] = useState(false)
  const [agentsLoading, setAgentsLoading] = useState(true)
  const [agentsError, setAgentsError] = useState(false)
  const [agentStats, setAgentStats] = useState<Record<string, { totalDates: number; avgRating: number; achievements?: { id: string; title: string; emoji: string }[] }>>({})

  // Search, filter, sort state
  const [search, setSearch] = useState('')
  const [activePersonalities, setActivePersonalities] = useState<Set<string>>(new Set())
  const [sortMode, setSortMode] = useState<SortMode>('newest')

  // Round & turns selector
  const [totalRounds, setTotalRounds] = useState(2)
  const [turnsPerAgent, setTurnsPerAgent] = useState(5)

  // Edit / Delete state
  const [editingAgent, setEditingAgent] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Event history
  const [eventHistory, setEventHistory] = useState<EventHistoryItem[]>([])
  const [creatingNewEvent, setCreatingNewEvent] = useState(false)

  // Pagination
  const [visibleCount, setVisibleCount] = useState(20)

  // Confirm dialog
  const [showConfirm, setShowConfirm] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)
  const { addToast } = useToast()

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

  const fetchAgentStats = useCallback(() => {
    fetch('/api/agents/stats')
      .then((r) => r.json())
      .then((data) => setAgentStats(data.stats || {}))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchAgents()
    fetchAgentStats()
    fetchEvent()
    fetchEventHistory()
    // Auto-refresh agent list every 5s for live lobby feel
    const interval = setInterval(() => {
      fetchAgents()
      fetchEvent()
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchAgents, fetchAgentStats, fetchEvent, fetchEventHistory])

  const createNewEvent = async () => {
    setCreatingNewEvent(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `相亲大会 #${Date.now()}`, totalRounds, turnsPerAgent }),
      })
      if (res.ok) {
        fetchEvent()
        fetchEventHistory()
      } else {
        const data = await res.json()
        addToast('error', data.error || '创建活动失败')
      }
    } catch {
      addToast('error', '网络错误，请重试')
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
    setVisibleCount(20)
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

  const handleDeleteAgent = async () => {
    if (!agent) return
    setDeleting(true)
    try {
      const resp = await fetch(`/api/agents/${agent.id}`, { method: 'DELETE' })
      if (resp.ok || resp.status === 204) {
        setShowDeleteConfirm(false)
        await refresh()
        fetchAgents()
      } else {
        const data = await resp.json().catch(() => ({}))
        addToast('error', data.error || '删除失败，请重试')
      }
    } catch {
      addToast('error', '网络错误，请重试')
    } finally {
      setDeleting(false)
    }
  }

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
          body: JSON.stringify({ name: `相亲大会 #${Date.now()}`, totalRounds, turnsPerAgent }),
        })
        const data = await res.json()
        eventId = data.event?.id
      }
      if (!eventId) {
        addToast('error', '创建活动失败，请重试')
        return
      }

      // Start the event
      const res = await fetch(`/api/events/${eventId}/start`, { method: 'POST' })
      if (res.ok) {
        window.location.href = '/dates'
      } else {
        addToast('error', '启动活动失败，请重试')
      }
    } catch {
      addToast('error', '网络错误，请重试')
    } finally {
      setStarting(false)
    }
  }

  const handleResetEvent = async () => {
    if (!event) return
    setResetting(true)
    try {
      const resp = await fetch(`/api/events/${event.id}`, { method: 'PATCH' })
      if (resp.ok) {
        setShowResetConfirm(false)
        fetchEvent()
        fetchEventHistory()
        addToast('success', '活动已重置为报名状态')
      } else {
        const data = await resp.json().catch(() => ({}))
        addToast('error', data.error || '重置失败，请重试')
      }
    } catch {
      addToast('error', '网络错误，请重试')
    } finally {
      setResetting(false)
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

  return (
    <div className="min-h-screen">
      <Navbar />

      <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* A2A Agent Registration */}
        <A2ARegisterSection onRegistered={fetchAgents} />

        {/* Create Agent (only when user has no agent) */}
        {!agent && !editingAgent && (
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

        {/* Edit Agent Form */}
        {editingAgent && agent && (
          <section className="mb-8 sm:mb-10">
            <div className="bg-white rounded-2xl border border-purple/20 ring-1 ring-purple/10 p-5 sm:p-8 shadow-sm">
              <h2 className="font-display text-xl sm:text-2xl font-bold mb-2">编辑约会人格</h2>
              <p className="text-secondary text-xs sm:text-sm mb-4 sm:mb-6">
                修改你的 AI 分身资料
              </p>
              <CreateAgentForm
                editAgent={{
                  id: agent.id,
                  name: agent.name,
                  avatarEmoji: agent.avatarEmoji,
                  personalityType: agent.personalityType,
                  interests: agent.interests,
                  catchphrase: agent.catchphrase,
                }}
                onCreated={() => {
                  setEditingAgent(false)
                  refresh()
                  fetchAgents()
                }}
                onCancel={() => setEditingAgent(false)}
              />
            </div>
          </section>
        )}

        {/* Chemistry Heatmap */}
        {agents.length >= 2 && <ChemistryHeatmap />}

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

            <EventControls
              agent={!!agent}
              agentCount={agents.length}
              hasStartedEvent={hasStartedEvent}
              event={event}
              totalRounds={totalRounds}
              setTotalRounds={setTotalRounds}
              turnsPerAgent={turnsPerAgent}
              setTurnsPerAgent={setTurnsPerAgent}
              starting={starting}
              onStartClick={() => setShowConfirm(true)}
              onResetClick={() => setShowResetConfirm(true)}
            />
          </div>

          <AgentSearchFilter
            search={search}
            onSearchChange={setSearch}
            personalityTypes={personalityTypes}
            activePersonalities={activePersonalities}
            onTogglePersonality={togglePersonality}
            sortMode={sortMode}
            onSortChange={setSortMode}
          />

          {/* Content: Loading / Error / Empty / Grid */}
          {agentsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4" aria-busy="true" aria-label="加载中">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-[var(--border)] p-4 sm:p-5 animate-pulse"
                >
                  <div className="flex items-start gap-3 sm:gap-4 mb-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[var(--border)]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-[var(--border)] rounded w-2/3" />
                      <div className="h-3 bg-[var(--bg-elevated)] rounded w-1/3" />
                    </div>
                  </div>
                  <div className="h-3 bg-[var(--bg-elevated)] rounded w-full mb-3" />
                  <div className="flex gap-1.5">
                    <div className="h-5 bg-[var(--bg-elevated)] rounded-full w-12" />
                    <div className="h-5 bg-[var(--bg-elevated)] rounded-full w-16" />
                    <div className="h-5 bg-[var(--bg-elevated)] rounded-full w-10" />
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
            <div className="text-center py-16 sm:py-20">
              <div className="text-6xl mb-4">🦞</div>
              <h3 className="font-display text-lg font-bold mb-2">还没有嘉宾入场</h3>
              <p className="text-muted text-sm mb-6 max-w-sm mx-auto">
                创建你的约会人格，成为第一位入场的嘉宾吧！
                <br />
                至少需要 2 位嘉宾才能开始相亲大会。
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-muted">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple/30" />
                  <span>创建人格</span>
                </div>
                <svg className="w-4 h-4 text-muted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple/30" />
                  <span>等待匹配</span>
                </div>
                <svg className="w-4 h-4 text-muted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple/30" />
                  <span>开始约会</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredAgents.slice(0, visibleCount).map((a) => (
                  <AgentCard
                    key={a.id}
                    agent={a}
                    isMe={a.id === agent?.id}
                    stats={agentStats[a.id]}
                    onEdit={a.id === agent?.id ? () => setEditingAgent(true) : undefined}
                    onDelete={a.id === agent?.id ? () => setShowDeleteConfirm(true) : undefined}
                  />
                ))}
              </div>
              {filteredAgents.length > visibleCount && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => setVisibleCount((c) => c + 20)}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold text-purple border border-purple/20 hover:bg-purple/5 transition-all duration-200"
                  >
                    加载更多（还有 {filteredAgents.length - visibleCount} 位）
                  </button>
                </div>
              )}
            </>
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

        <EventHistory eventHistory={eventHistory} currentEventId={event?.id} />
      </main>

      {/* Start Event Confirm Dialog */}
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={startEvent}
        confirming={starting}
        icon="🦞"
        titleId="confirm-title"
        title="确定要开始吗？"
        description={`开始后不能再注册新 Agent。本次活动将进行 ${totalRounds} 轮约会，每场约会 ${turnsPerAgent * 2} 条消息。`}
        confirmLabel="确定开始"
        confirmingLabel="配对中..."
      >
        {agents.length % 2 === 1 && (
          <p className="text-amber-600 text-xs mt-2 bg-amber-50 rounded-lg px-3 py-2">
            当前有 {agents.length} 位嘉宾（奇数），将有一位嘉宾本轮轮空
          </p>
        )}
      </ConfirmDialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAgent}
        confirming={deleting}
        icon="⚠️"
        titleId="delete-title"
        title="确定要删除吗？"
        description="删除后你的约会人格将从大厅中移除，此操作不可撤销。"
        confirmLabel="确定删除"
        confirmingLabel="删除中..."
      />

      {/* Reset Event Confirm Dialog */}
      <ConfirmDialog
        open={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetEvent}
        confirming={resetting}
        icon="🔄"
        titleId="reset-title"
        title="重置活动？"
        description="将清除所有约会记录和评分，活动回到报名状态。此操作不可撤销。"
        confirmLabel="确定重置"
        confirmingLabel="重置中..."
      />

      <ScrollToTop />
    </div>
  )
}

function A2ARegisterSection({ onRegistered }: { onRegistered: () => void }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState<{
    name: string
    avatarEmoji: string
    personalityType: string
  } | null>(null)

  const handleRegister = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError('')
    setRegistered(null)

    try {
      const res = await fetch('/api/a2a/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()

      if (res.ok) {
        setRegistered(data.agent)
        setUrl('')
        onRegistered()
      } else {
        setError(data.error || '注册失败')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mb-8 sm:mb-10">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-semibold text-secondary hover:text-[var(--text-primary)] transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        注册外部 Agent (A2A)
      </button>

      {open && (
        <div className="mt-3 bg-white rounded-2xl border border-[var(--border)] p-5 sm:p-6 shadow-sm animate-slide-in">
          <p className="text-xs text-muted mb-3">
            输入外部 Agent 的 URL，系统会自动获取其 Agent Card 并注册到大厅
          </p>

          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(''); setRegistered(null) }}
              placeholder="https://example.com"
              aria-label="Agent URL"
              className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm focus:outline-none focus:ring-2 focus:ring-purple/20 focus:border-purple/30 transition-all"
            />
            <button
              onClick={handleRegister}
              disabled={loading || !url.trim()}
              className="
                px-5 py-2.5 rounded-xl text-sm font-semibold text-white
                bg-gradient-to-r from-purple to-[#6c3fc4]
                shadow-md shadow-purple/20 disabled:opacity-50
                transition-all duration-200 flex-shrink-0
                flex items-center gap-2
              "
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {loading ? '注册中...' : '注册'}
            </button>
          </div>

          {error && (
            <p className="text-xs text-coral mt-2">{error}</p>
          )}

          {registered && (
            <div className="mt-3 px-4 py-3 rounded-xl bg-teal/5 border border-teal/20">
              <div className="flex items-center gap-2">
                <span className="text-xl">{registered.avatarEmoji}</span>
                <div>
                  <div className="text-sm font-semibold">{registered.name}</div>
                  <div className="text-xs text-muted">{registered.personalityType}</div>
                </div>
                <span className="ml-auto text-xs text-teal font-medium">注册成功</span>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
