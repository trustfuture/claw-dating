'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/Navbar'
import { useToast } from '@/components/Toast'

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

export default function AdminPage() {
  const { user, loading } = useAuth()
  const { addToast } = useToast()
  const [agents, setAgents] = useState<AdminAgent[]>([])
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [tab, setTab] = useState<'agents' | 'events'>('agents')
  const [fetching, setFetching] = useState(true)

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

  const deleteAgent = async (id: string, type: string) => {
    if (!confirm('确定要删除这个 Agent 吗？')) return
    try {
      const res = await fetch(`/api/admin/agents/${id}?type=${type}`, { method: 'DELETE' })
      if (res.ok) {
        addToast('success', 'Agent 已删除')
        fetchData()
      } else {
        const data = await res.json()
        addToast('error', data.error || '删除失败')
      }
    } catch {
      addToast('error', '网络错误')
    }
  }

  const deleteEvent = async (id: string) => {
    if (!confirm('确定要删除这个活动及其所有数据吗？此操作不可撤销。')) return
    try {
      const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' })
      if (res.ok) {
        addToast('success', '活动已删除')
        fetchData()
      } else {
        const data = await res.json()
        addToast('error', data.error || '删除失败')
      }
    } catch {
      addToast('error', '网络错误')
    }
  }

  const resetEvent = async (id: string) => {
    if (!confirm('确定要重置这个活动吗？所有约会数据将被清除。')) return
    try {
      const res = await fetch(`/api/admin/events/${id}/reset`, { method: 'POST' })
      if (res.ok) {
        addToast('success', '活动已重置')
        fetchData()
      } else {
        const data = await res.json()
        addToast('error', data.error || '重置失败')
      }
    } catch {
      addToast('error', '网络错误')
    }
  }

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
                  className="bg-white rounded-xl border border-[var(--border)] px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0">{agent.avatarEmoji}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{agent.name}</div>
                      <div className="text-[10px] text-muted flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded ${agent.type === 'a2a' ? 'bg-purple/10 text-purple' : 'bg-teal/10 text-teal'}`}>
                          {agent.type === 'a2a' ? 'A2A' : 'SecondMe'}
                        </span>
                        <span>{agent.personalityType}</span>
                        {agent.url && <span className="truncate max-w-[200px]">{agent.url}</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteAgent(agent.id, agent.type)}
                    className="text-xs px-3 py-1.5 rounded-lg text-coral border border-coral/20 hover:bg-coral/5 transition-colors flex-shrink-0"
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
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm font-semibold">{event.name}</div>
                      <div className="text-[10px] text-muted flex items-center gap-2 mt-0.5">
                        <span className={`px-1.5 py-0.5 rounded ${
                          event.phase === 'results' ? 'bg-teal/10 text-teal'
                            : event.phase === 'dating' ? 'bg-purple/10 text-purple'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {event.phase}
                        </span>
                        <span>{event.participantCount} 参与者</span>
                        <span>{event.dateCount} 场约会</span>
                        <span>R{event.currentRound}/{event.totalRounds}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
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
                        onClick={() => resetEvent(event.id)}
                        className="text-xs px-3 py-1.5 rounded-lg text-secondary border border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors"
                      >
                        重置
                      </button>
                      <button
                        onClick={() => deleteEvent(event.id)}
                        className="text-xs px-3 py-1.5 rounded-lg text-coral border border-coral/20 hover:bg-coral/5 transition-colors"
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
      </main>
    </div>
  )
}
