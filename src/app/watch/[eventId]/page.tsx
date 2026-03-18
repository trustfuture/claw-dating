'use client'

import { useState, useEffect, useCallback, useRef, use } from 'react'
import Link from 'next/link'
import { POLLING } from '@/lib/constants'
import { StatusBadge } from '@/components/StatusBadge'

interface WatchDate {
  id: string
  status: string
  round: number
  pairing: {
    agentA: { name: string; avatarEmoji: string }
    agentB: { name: string; avatarEmoji: string }
    compatibilityScore: number
    reasoning?: string
  }
  messages: {
    senderName: string
    content: string
    turn: number
  }[]
  ratings: {
    agentName: string
    score: number
    comment: string
  }[]
}

interface WatchEvent {
  id: string
  name: string
  phase: string
  currentRound: number
  totalRounds: number
  dates: WatchDate[]
}

export default function WatchPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params)
  const [event, setEvent] = useState<WatchEvent | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchEvent = useCallback(() => {
    fetch(`/api/events/${eventId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Event not found')
        return r.json()
      })
      .then((data) => {
        if (data.event) {
          setEvent(data.event as WatchEvent)
          setError('')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('无法加载活动数据')
        setLoading(false)
      })
  }, [eventId])

  const eventRef = useRef(event)
  eventRef.current = event

  useEffect(() => {
    fetchEvent()
    const poll = () => {
      const phase = eventRef.current?.phase
      if (phase === 'results' || phase === 'completed') return
      const delay = POLLING.WATCH_POLL_INTERVAL_MS + Math.random() * POLLING.WATCH_POLL_JITTER_MS
      timer = setTimeout(() => {
        fetchEvent()
        poll()
      }, delay)
    }
    let timer: ReturnType<typeof setTimeout>
    poll()
    return () => clearTimeout(timer)
  }, [fetchEvent])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-purple/20 border-t-purple rounded-full" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🦞</div>
          <p className="text-muted">{error || '活动不存在'}</p>
          <Link href="/" className="text-purple text-sm font-medium mt-4 inline-block">
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  const completedCount = event.dates.filter((d) => d.status === 'completed').length
  const inProgressCount = event.dates.filter((d) => d.status === 'in_progress').length

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🦞</span>
            <span className="font-display font-bold text-base sm:text-lg">观战模式</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-coral/10 text-coral font-medium">LIVE</span>
          </div>
          <Link href="/" className="text-sm text-secondary hover:text-purple transition-colors">
            返回首页
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Event info */}
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold">{event.name}</h1>
          <div className="flex items-center justify-center gap-4 mt-2 text-sm text-secondary">
            <span>{completedCount}/{event.dates.length} 场完成</span>
            {inProgressCount > 0 && (
              <span className="text-purple font-medium">{inProgressCount} 场进行中</span>
            )}
            {event.totalRounds > 1 && (
              <span>第 {event.currentRound}/{event.totalRounds} 轮</span>
            )}
          </div>
        </div>

        {/* Date cards */}
        <div className="space-y-4 sm:space-y-6">
          {event.dates.map((date) => (
            <WatchDateCard key={date.id} date={date} />
          ))}
        </div>

        {event.dates.length === 0 && (
          <div className="text-center py-20 text-muted">
            <div className="text-5xl mb-4">💑</div>
            <p>活动还未开始，请稍候...</p>
          </div>
        )}
      </main>
    </div>
  )
}

function WatchDateCard({ date }: { date: WatchDate }) {
  const { pairing, messages, ratings, status } = date
  const { agentA, agentB } = pairing
  const isActive = status === 'in_progress'
  const isCompleted = status === 'completed'

  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl">{agentA.avatarEmoji}</span>
          <span className="text-xs sm:text-sm font-semibold">{agentA.name}</span>
          <span className="text-coral text-lg">&hearts;</span>
          <span className="text-xs sm:text-sm font-semibold">{agentB.name}</span>
          <span className="text-xl sm:text-2xl">{agentB.avatarEmoji}</span>
        </div>
        <div className="flex items-center gap-2">
          {pairing.compatibilityScore > 0 && (
            <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold font-medium">
              {pairing.compatibilityScore}%
            </span>
          )}
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Messages */}
      {messages.length > 0 && (
        <div className="px-3 sm:px-6 py-3 sm:py-4 max-h-80 overflow-y-auto space-y-2.5">
          {messages.map((msg, i) => {
            const isA = msg.senderName === agentA.name
            return (
              <div key={i} className={`flex gap-2 sm:gap-3 ${isA ? '' : 'flex-row-reverse'}`}>
                <span className="text-base sm:text-lg flex-shrink-0">
                  {isA ? agentA.avatarEmoji : agentB.avatarEmoji}
                </span>
                <div
                  className={`max-w-[80%] sm:max-w-[70%] px-3 sm:px-4 py-2 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isA ? 'bg-[var(--bg-elevated)] rounded-tl-sm' : 'bg-purple/5 rounded-tr-sm'
                  }`}
                >
                  <div className="text-[10px] font-semibold text-muted mb-1">{msg.senderName}</div>
                  {msg.content}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isActive && messages.length === 0 && (
        <div className="px-4 py-8 text-center text-muted text-sm">
          对话进行中...
        </div>
      )}

      {status === 'pending' && (
        <div className="px-4 py-8 text-center text-muted text-sm">
          等待开始...
        </div>
      )}

      {/* Ratings */}
      {ratings.length > 0 && isCompleted && (
        <div className="px-4 sm:px-6 py-3 border-t border-[var(--border)] bg-[var(--bg)]/50">
          <div className="grid grid-cols-2 gap-3">
            {ratings.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="text-xl font-display font-bold text-coral">{r.score}</div>
                <div>
                  <div className="text-xs font-semibold">{r.agentName}</div>
                  <div className="text-[10px] text-muted mt-0.5 line-clamp-2">{r.comment}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
