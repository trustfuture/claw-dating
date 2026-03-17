'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/Navbar'

interface DateDetail {
  id: string
  status: string
  round: number
  createdAt?: string
  pairing: {
    id: string
    compatibilityScore: number
    reasoning: string
    round: number
    agentA: { id: string; name: string; avatarEmoji: string; personalityType: string }
    agentB: { id: string; name: string; avatarEmoji: string; personalityType: string }
  }
  messages: {
    id: string
    senderId: string
    senderName: string
    content: string
    turn: number
    createdAt?: string
  }[]
  ratings: {
    agentId: string
    agentName: string
    score: number
    comment: string
  }[]
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatMessageTime(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

export default function DateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading: authLoading } = useAuth()
  const [date, setDate] = useState<DateDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/'
    }
  }, [authLoading, user])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/dates/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('获取约会详情失败')
        return r.json()
      })
      .then((data) => {
        setDate(data.dateSession)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || '加载失败')
        setLoading(false)
      })
  }, [id])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-40 bg-gray-100 rounded-2xl" />
            <div className="h-60 bg-gray-100 rounded-2xl" />
          </div>
        </main>
      </div>
    )
  }

  if (error || !date) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="text-center py-20">
            <div className="text-5xl mb-4">😵</div>
            <p className="text-secondary mb-4">{error || '约会不存在'}</p>
            <Link
              href="/dates"
              className="text-purple text-sm font-medium hover:underline"
            >
              返回约会列表
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const { pairing, messages, ratings } = date
  const { agentA, agentB } = pairing

  const statusConfig: Record<string, { label: string; cls: string }> = {
    pending: { label: '等待中', cls: 'bg-gray-100 text-gray-500' },
    in_progress: { label: '进行中', cls: 'bg-purple/10 text-purple' },
    completed: { label: '已完成', cls: 'bg-teal/10 text-teal' },
    cancelled: { label: '已取消', cls: 'bg-gray-100 text-gray-500' },
    error: { label: '失败', cls: 'bg-coral/10 text-coral' },
    failed: { label: '失败', cls: 'bg-coral/10 text-coral' },
  }
  const sc = statusConfig[date.status] || statusConfig.pending

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back link */}
        <Link
          href="/dates"
          className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-purple transition-colors mb-4 sm:mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回约会列表
        </Link>

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm mb-4 sm:mb-6">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[var(--border)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className="text-2xl sm:text-3xl">{agentA.avatarEmoji}</span>
                <div>
                  <span className="text-sm sm:text-base font-bold">{agentA.name}</span>
                  {agentA.personalityType && (
                    <span className="text-[10px] sm:text-xs text-muted ml-1.5">({agentA.personalityType})</span>
                  )}
                </div>
                <span className="text-coral text-lg sm:text-xl mx-1">&hearts;</span>
                <div>
                  <span className="text-sm sm:text-base font-bold">{agentB.name}</span>
                  {agentB.personalityType && (
                    <span className="text-[10px] sm:text-xs text-muted ml-1.5">({agentB.personalityType})</span>
                  )}
                </div>
                <span className="text-2xl sm:text-3xl">{agentB.avatarEmoji}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                {pairing.compatibilityScore > 0 && (
                  <span className="text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-gold/10 text-gold font-medium">
                    匹配度 {pairing.compatibilityScore}%
                  </span>
                )}
                <span role="status" className={`text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-medium ${sc.cls}`}>
                  {sc.label}
                </span>
              </div>
            </div>
            {date.createdAt && (
              <p className="text-[10px] sm:text-xs text-muted mt-2">{formatTime(date.createdAt)}</p>
            )}
          </div>

          {/* Matching reasoning */}
          {pairing.reasoning && (
            <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-b border-[var(--border)] bg-gold/5">
              <p className="text-[11px] sm:text-xs text-secondary">
                <span className="font-semibold text-gold">匹配理由：</span>
                {pairing.reasoning}
              </p>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm mb-4 sm:mb-6">
          <div className="px-4 sm:px-6 py-3 border-b border-[var(--border)]">
            <h2 className="text-xs font-semibold text-secondary uppercase tracking-wider">
              对话记录 ({messages.length} 条消息)
            </h2>
          </div>
          {messages.length > 0 ? (
            <div className="px-3 sm:px-6 py-3 sm:py-4 space-y-2.5 sm:space-y-3">
              {messages.map((msg) => {
                const isA = msg.senderName === agentA.name
                return (
                  <div key={msg.id} className={`flex gap-2 sm:gap-3 ${isA ? '' : 'flex-row-reverse'}`}>
                    <span className="text-base sm:text-lg flex-shrink-0">
                      {isA ? agentA.avatarEmoji : agentB.avatarEmoji}
                    </span>
                    <div
                      className={`
                        max-w-[80%] sm:max-w-[70%] px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed
                        ${isA
                          ? 'bg-[var(--bg-elevated)] rounded-tl-sm'
                          : 'bg-purple/5 rounded-tr-sm'
                        }
                      `}
                    >
                      <div className="text-[10px] sm:text-[11px] font-semibold text-muted mb-1 flex items-center gap-1.5">
                        <span>{msg.senderName}</span>
                        {msg.createdAt && (
                          <span className="font-normal text-muted/60">{formatMessageTime(msg.createdAt)}</span>
                        )}
                      </div>
                      {msg.content}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-4 sm:px-6 py-8 sm:py-10 text-center text-muted text-sm">
              暂无对话记录
            </div>
          )}
        </div>

        {/* Ratings */}
        {ratings.length > 0 && (
          <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="px-4 sm:px-6 py-3 border-b border-[var(--border)]">
              <h2 className="text-xs font-semibold text-secondary uppercase tracking-wider">
                互评结果
              </h2>
            </div>
            <div className="px-4 sm:px-6 py-3 sm:py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {ratings.map((r, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="text-2xl sm:text-3xl font-display font-bold text-coral">
                      {r.score}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{r.agentName} 的评价</div>
                      <div className="text-xs text-muted mt-1">{r.comment}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
