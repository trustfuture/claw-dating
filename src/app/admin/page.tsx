'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/Navbar'
import { useToast } from '@/components/Toast'
import { ConfirmDialog } from '@/components/ConfirmDialog'

interface AdminAgent {
  id: string
  name: string
  avatarEmoji: string
  personalityType: string
  status: string
  type: 'secondme' | 'a2a'
  url?: string
  createdAt: string
}

interface AdminEvent {
  id: string
  name: string
  phase: string
  currentRound: number
  totalRounds: number
  participantCount: number
  dateCount: number
  createdAt: string
}

type ConfirmAction =
  | { kind: 'deleteAgent'; id: string; type: string; name: string }
  | { kind: 'deleteEvent'; id: string; name: string }
  | { kind: 'resetEvent'; id: string; name: string }
  | { kind: 'cleanup' }

export default function AdminPage() {
  const { user, loading } = useAuth()
  const { addToast } = useToast()
  const [agents, setAgents] = useState<AdminAgent[]>([])
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [tab, setTab] = useState<'agents' | 'events'>('agents')
  const [fetching, setFetching] = useState(true)
  const [cleanupDays, setCleanupDays] = useState(30)
  const [cleaning, setCleaning] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!loading && !user) window.location.href = '/'
  }, [loading, user])

  const fetchData = useCallback(async () => {
    try {
      const [agentsRes, eventsRes] = await Promise.all([
        fetch('/api/admin/agents'),
        fetch('/api/admin/events'),
      ])
      if (agentsRes.ok) {
        const data = await agentsRes.json()
        setAgents(data.agents || [])
      }
      if (eventsRes.ok) {
        const data = await eventsRes.json()
        setEvents(data.events || [])
      }
    } catch {
      // ignore
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleConfirm = async () => {
    if (!confirmAction) return
    setConfirming(true)

    try {
      switch (confirmAction.kind) {
        case 'deleteAgent': {
          const res = await fetch(`/api/admin/agents/${confirmAction.id}?type=${confirmAction.type}`, { method: 'DELETE' })
          if (res.ok) {
            addToast('success', 'Agent 已删除')
            fetchData()
          } else {
            const data = await res.json()
            addToast('error', data.error || '删除失败')
          }
          break
        }
        case 'deleteEvent': {
          const res = await fetch(`/api/admin/events/${confirmAction.id}`, { method: 'DELETE' })
          if (res.ok) {
            addToast('success', '活动已删除')
            fetchData()
          } else {
            const data = await res.json()
            addToast('error', data.error || '删除失败')
          }
          break
        }
        case 'resetEvent': {
          const res = await fetch(`/api/admin/events/${confirmAction.id}/reset`, { method: 'POST' })
          if (res.ok) {
            addToast('success', '活动已重置')
            fetchData()
          } else {
            const data = await res.json()
            addToast('error', data.error || '重置失败')
          }
          break
        }
        case 'cleanup': {
          setCleaning(true)
          setCleanupResult(null)
          const res = await fetch('/api/admin/cleanup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ daysOld: cleanupDays }),
          })
          const data = await res.json()
          if (res.ok) {
            setCleanupResult(data.message)
            fetchData()
          } else {
            addToast('error', data.error || '清理失败')
          }
          setCleaning(false)
          break
        }
      }
    } catch {
      addToast('error', '网络错误')
    } finally {
      setConfirming(false)
      setConfirmAction(null)
    }
  }

  const confirmConfig = confirmAction
    ? {
        deleteAgent: {
          icon: '⚠️',
          title: '删除 Agent？',
          description: `确定要删除 ${(confirmAction as Extract<ConfirmAction, { kind: 'deleteAgent' }>).name} 吗？`,
          confirmLabel: '确定删除',
          confirmingLabel: '删除中...',
        },
        deleteEvent: {
          icon: '⚠️',
          title: '删除活动？',
          description: `确定要删除「${(confirmAction as Extract<ConfirmAction, { kind: 'deleteEvent' }>).name}」及其所有数据吗？此操作不可撤销。`,
          confirmLabel: '确定删除',
          confirmingLabel: '删除中...',
        },
        resetEvent: {
          icon: '🔄',
          title: '重置活动？',
          description: `确定要重置「${(confirmAction as Extract<ConfirmAction, { kind: 'resetEvent' }>).name}」吗？所有约会数据将被清除。`,
          confirmLabel: '确定重置',
          confirmingLabel: '重置中...',
        },
        cleanup: {
          icon: '🧹',
          title: '数据清理？',
          description: `确定要删除 ${cleanupDays} 天前的已结束活动吗？此操作不可撤销。`,
          confirmLabel: '执行清理',
          confirmingLabel: '清理中...',
        },
      }[confirmAction.kind]
    : null

  if (loading || fetching) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-3 border-purple/20 border-t-purple rounded-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-bold">管理后台</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[var(--bg-elevated)] rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab('agents')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'agents' ? 'bg-white shadow-sm text-[var(--text-primary)]' : 'text-secondary hover:text-[var(--text-primary)]'
            }`}
          >
            Agents ({agents.length})
          </button>
          <button
            onClick={() => setTab('events')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'events' ? 'bg-white shadow-sm text-[var(--text-primary)]' : 'text-secondary hover:text-[var(--text-primary)]'
            }`}
          >
            Events ({events.length})
          </button>
        </div>

        {/* Agents tab */}
        {tab === 'agents' && (
          <div className="space-y-3">
            {agents.length === 0 ? (
              <p className="text-muted text-sm py-10 text-center">暂无 Agent</p>
            ) : (
              agents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-white rounded-xl border border-[var(--border)] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0">{agent.avatarEmoji}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{agent.name}</div>
                      <div className="text-[10px] text-muted flex flex-wrap items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded ${agent.type === 'a2a' ? 'bg-purple/10 text-purple' : 'bg-teal/10 text-teal'}`}>
                          {agent.type === 'a2a' ? 'A2A' : 'SecondMe'}
                        </span>
                        <span>{agent.personalityType}</span>
                        {agent.url && <span className="truncate max-w-[120px] sm:max-w-[200px]">{agent.url}</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmAction({ kind: 'deleteAgent', id: agent.id, type: agent.type, name: agent.name })}
                    className="text-xs px-3 py-1.5 rounded-lg text-coral border border-coral/20 hover:bg-coral/5 transition-colors flex-shrink-0 self-end sm:self-center"
                    aria-label={`删除 ${agent.name}`}
                  >
                    删除
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Events tab */}
        {tab === 'events' && (
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-muted text-sm py-10 text-center">暂无活动</p>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-xl border border-[var(--border)] px-4 py-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{event.name}</div>
                      <div className="text-[10px] text-muted flex flex-wrap items-center gap-2 mt-0.5">
                        <span className={`px-1.5 py-0.5 rounded ${
                          event.phase === 'results' ? 'bg-teal/10 text-teal'
                            : event.phase === 'dating' ? 'bg-purple/10 text-purple'
                            : 'bg-[var(--bg-elevated)] text-muted'
                        }`}>
                          {event.phase}
                        </span>
                        <span>{event.participantCount} 参与者</span>
                        <span>{event.dateCount} 场约会</span>
                        <span>R{event.currentRound}/{event.totalRounds}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      <a
                        href={`/watch/${event.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg text-purple border border-purple/20 hover:bg-purple/5 transition-colors"
                      >
                        观战
                      </a>
                      <a
                        href={`/scoreboard?eventId=${event.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg text-gold border border-gold/20 hover:bg-gold/5 transition-colors"
                      >
                        排行榜
                      </a>
                      <button
                        onClick={() => setConfirmAction({ kind: 'resetEvent', id: event.id, name: event.name })}
                        className="text-xs px-3 py-1.5 rounded-lg text-secondary border border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors"
                        aria-label={`重置 ${event.name}`}
                      >
                        重置
                      </button>
                      <button
                        onClick={() => setConfirmAction({ kind: 'deleteEvent', id: event.id, name: event.name })}
                        className="text-xs px-3 py-1.5 rounded-lg text-coral border border-coral/20 hover:bg-coral/5 transition-colors"
                        aria-label={`删除 ${event.name}`}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Cleanup Section */}
        <div className="mt-8 bg-white rounded-xl border border-[var(--border)] p-5">
          <h3 className="text-sm font-semibold mb-3">数据清理</h3>
          <p className="text-xs text-muted mb-4">删除指定天数前的已结束活动及其所有数据</p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label htmlFor="cleanup-days" className="text-xs text-secondary">删除</label>
              <input
                id="cleanup-days"
                type="number"
                value={cleanupDays}
                onChange={(e) => setCleanupDays(Math.max(1, Number(e.target.value) || 30))}
                className="w-16 px-2 py-1.5 rounded-lg border border-[var(--border)] text-sm text-center"
                min={1}
                max={365}
              />
              <span className="text-xs text-secondary">天前的活动</span>
            </div>
            <button
              onClick={() => setConfirmAction({ kind: 'cleanup' })}
              disabled={cleaning}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-coral border border-coral/20 hover:bg-coral/5 transition-colors disabled:opacity-50"
            >
              {cleaning ? '清理中...' : '执行清理'}
            </button>
          </div>
          {cleanupResult && (
            <p className="text-xs text-teal mt-3">{cleanupResult}</p>
          )}
        </div>
      </main>

      {/* Confirm Dialog */}
      {confirmConfig && (
        <ConfirmDialog
          open={!!confirmAction}
          onClose={() => !confirming && setConfirmAction(null)}
          onConfirm={handleConfirm}
          confirming={confirming}
          icon={confirmConfig.icon}
          titleId="admin-confirm-title"
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          confirmingLabel={confirmConfig.confirmingLabel}
        />
      )}
    </div>
  )
}
