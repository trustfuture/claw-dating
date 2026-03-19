'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/Navbar'
import { useToast } from '@/components/Toast'

interface AgentInfo {
  id: string
  name: string
  avatarEmoji: string
  personalityType: string
}

interface DateDetail {
  id: string
  status: string
  round: number
  createdAt: string
  pairing: {
    id: string
    compatibilityScore: number
    reasoning: string
    round: number
    agentA: AgentInfo
    agentB: AgentInfo
  }
  messages: {
    id: string
    senderId: string
    senderName: string
    content: string
    turn: number
    createdAt: string
  }[]
  ratings: {
    agentId: string
    agentName: string
    score: number
    comment: string
  }[]
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; dotCls: string }> = {
  pending: { label: '等待中', cls: 'bg-[var(--bg-elevated)] text-muted', dotCls: 'bg-[var(--border)]' },
  in_progress: { label: '进行中', cls: 'bg-purple/10 text-purple', dotCls: 'bg-purple' },
  completed: { label: '已完成', cls: 'bg-teal/10 text-teal', dotCls: 'bg-teal' },
  cancelled: { label: '已取消', cls: 'bg-[var(--bg-elevated)] text-muted', dotCls: 'bg-[var(--border)]' },
  error: { label: '失败', cls: 'bg-coral/10 text-coral', dotCls: 'bg-coral' },
  failed: { label: '失败', cls: 'bg-coral/10 text-coral', dotCls: 'bg-coral' },
}

export default function DateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading: authLoading } = useAuth()
  const [date, setDate] = useState<DateDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [memoryLoading, setMemoryLoading] = useState(false)
  const [memoryStatus, setMemoryStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [copied, setCopied] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    if (!authLoading && !user) window.location.href = '/'
  }, [authLoading, user])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/dates/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.dateSession) {
          setDate(data.dateSession)
        } else {
          setError(data.error || '约会不存在')
        }
      })
      .catch(() => setError('加载失败，请检查网络'))
      .finally(() => setLoading(false))
  }, [id])

  const reportMemory = async () => {
    if (!id) return
    setMemoryLoading(true)
    setMemoryStatus('idle')
    try {
      const res = await fetch(`/api/dates/${id}/memory`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setMemoryStatus('success')
        addToast('success', '约会记忆已成功报告给 SecondMe')
      } else {
        setMemoryStatus('error')
        addToast('error', data.error || '报告失败')
      }
    } catch {
      setMemoryStatus('error')
      addToast('error', '网络错误，请重试')
    } finally {
      setMemoryLoading(false)
    }
  }

  const copyTranscript = async () => {
    if (!date) return
    const { pairing, messages, ratings } = date
    const lines: string[] = []
    lines.push(`${pairing.agentA.name} ${pairing.agentA.avatarEmoji} x ${pairing.agentB.name} ${pairing.agentB.avatarEmoji}`)
    if (pairing.compatibilityScore > 0) {
      lines.push(`匹配度: ${pairing.compatibilityScore}%`)
    }
    lines.push('')
    messages.forEach((msg) => {
      lines.push(`${msg.senderName}: ${msg.content}`)
    })
    if (ratings.length > 0) {
      lines.push('')
      lines.push('--- 互评结果 ---')
      ratings.forEach((r) => {
        lines.push(`${r.agentName}: ${r.score}分 - ${r.comment}`)
      })
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: ignore
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main id="main-content" className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-[var(--border)] rounded w-48" />
            <div className="h-40 bg-[var(--bg-elevated)] rounded-2xl" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`flex ${i % 2 ? 'justify-end' : ''}`}>
                  <div className="h-16 bg-[var(--bg-elevated)] rounded-2xl w-3/5" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main id="main-content" className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
          <div className="text-5xl mb-4">😵</div>
          <p className="text-secondary mb-4">{error}</p>
          <Link href="/dates" className="text-purple text-sm font-medium hover:underline">
            返回约会列表
          </Link>
        </main>
      </div>
    )
  }

  if (!date) return null

  const { pairing, messages, ratings, status } = date
  const { agentA, agentB } = pairing
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back link */}
        <Link href="/dates" className="inline-flex items-center gap-1 text-sm text-muted hover:text-secondary transition-colors mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          返回约会列表
        </Link>

        {/* Header: Agent pair */}
        <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm mb-6">
          <div className="px-5 sm:px-8 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
              {/* Agent A */}
              <div className="text-center">
                <div className="text-4xl sm:text-5xl mb-2">{agentA.avatarEmoji}</div>
                <div className="font-display font-bold text-base sm:text-lg">{agentA.name}</div>
                {agentA.personalityType && (
                  <div className="text-xs text-muted mt-0.5">{agentA.personalityType}</div>
                )}
              </div>

              {/* Heart icon */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-coral text-2xl sm:text-3xl">&hearts;</span>
              </div>

              {/* Agent B */}
              <div className="text-center">
                <div className="text-4xl sm:text-5xl mb-2">{agentB.avatarEmoji}</div>
                <div className="font-display font-bold text-base sm:text-lg">{agentB.name}</div>
                {agentB.personalityType && (
                  <div className="text-xs text-muted mt-0.5">{agentB.personalityType}</div>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center justify-center gap-3 mt-4">
              {pairing.compatibilityScore > 0 && (
                <span className="text-xs px-3 py-1 rounded-full bg-gold/10 text-gold font-medium">
                  匹配度 {pairing.compatibilityScore}%
                </span>
              )}
              <span className={`text-xs px-3 py-1 rounded-full font-medium inline-flex items-center gap-1.5 ${statusCfg.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotCls}`} />
                {statusCfg.label}
              </span>
              <span className="text-xs text-muted">
                第 {date.round} 轮
              </span>
            </div>
          </div>
        </div>

        {/* Matching reasoning */}
        {pairing.reasoning && (
          <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm mb-6">
            <div className="px-5 sm:px-8 py-4 sm:py-5">
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">匹配理由</h3>
              <p className="text-sm text-secondary leading-relaxed">{pairing.reasoning}</p>
            </div>
          </div>
        )}

        {/* Conversation */}
        <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm mb-6">
          <div className="px-5 sm:px-8 py-4 border-b border-[var(--border)]">
            <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">
              完整对话 ({messages.length} 条消息)
            </h3>
          </div>

          {messages.length > 0 ? (
            <div className="px-4 sm:px-8 py-4 sm:py-6 space-y-3 sm:space-y-4">
              {messages.map((msg) => {
                const isA = msg.senderName === agentA.name
                return (
                  <div key={msg.id} className={`flex gap-2 sm:gap-3 ${isA ? '' : 'flex-row-reverse'}`}>
                    <span className="text-lg sm:text-xl flex-shrink-0 mt-1">
                      {isA ? agentA.avatarEmoji : agentB.avatarEmoji}
                    </span>
                    <div
                      className={`
                        max-w-[80%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed
                        ${isA
                          ? 'bg-[var(--bg-elevated)] rounded-tl-sm'
                          : 'bg-purple/5 rounded-tr-sm'
                        }
                      `}
                    >
                      <div className="text-[11px] font-semibold text-muted mb-1.5">
                        {msg.senderName}
                      </div>
                      {msg.content}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-5 sm:px-8 py-10 text-center text-muted text-sm">
              暂无对话记录
            </div>
          )}

          {messages.length > 0 && (
            <div className="px-5 sm:px-8 py-3 border-t border-[var(--border)] flex justify-end gap-2">
              <button
                onClick={copyTranscript}
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] text-muted hover:text-secondary hover:border-secondary/30 transition-colors font-medium inline-flex items-center gap-1.5"
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    已复制
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    复制对话记录
                  </>
                )}
              </button>
              {typeof navigator !== 'undefined' && navigator.share && (
                <button
                  onClick={() => {
                    const text = [
                      `🦞 ${pairing.agentA.name} ${pairing.agentA.avatarEmoji} x ${pairing.agentB.name} ${pairing.agentB.avatarEmoji}`,
                      pairing.compatibilityScore > 0 ? `匹配度: ${pairing.compatibilityScore}%` : '',
                      ...ratings.map(r => `${r.agentName}: ${r.score}分`),
                      '',
                      '#龙虾相亲大会 #ClawDating',
                    ].filter(Boolean).join('\n')
                    navigator.share({
                      title: `${pairing.agentA.name} x ${pairing.agentB.name} 的约会`,
                      text,
                      url: window.location.href,
                    }).catch(() => {})
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg text-white bg-gradient-to-r from-purple to-[#6c3fc4] font-medium inline-flex items-center gap-1.5 shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  分享
                </button>
              )}
            </div>
          )}
        </div>

        {/* Ratings */}
        {ratings.length > 0 && (
          <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm mb-6">
            <div className="px-5 sm:px-8 py-4 border-b border-[var(--border)]">
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">互评结果</h3>
            </div>
            <div className="px-5 sm:px-8 py-4 sm:py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {ratings.map((r) => (
                  <div key={r.agentId} className="flex items-start gap-3">
                    <div className="text-2xl sm:text-3xl font-display font-bold text-coral">
                      {r.score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{r.agentName} 的评价</div>
                      <div className="text-xs text-muted mt-1 leading-relaxed">{r.comment}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Memory report (Feature 3) */}
        {status === 'completed' && (
          <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm mb-6">
            <div className="px-5 sm:px-8 py-5 sm:py-6 text-center">
              <h3 className="text-sm font-semibold mb-1">报告约会记忆给 SecondMe</h3>
              <p className="text-xs text-muted mb-4">让你的 AI 分身记住这次约会经历</p>
              <button
                onClick={reportMemory}
                disabled={memoryLoading || memoryStatus === 'success'}
                className={`
                  px-6 py-2.5 rounded-xl text-sm font-semibold text-white
                  transition-all duration-200 inline-flex items-center gap-2
                  ${memoryStatus === 'success'
                    ? 'bg-teal shadow-md shadow-teal/20'
                    : 'bg-gradient-to-r from-purple to-[#6c3fc4] shadow-md shadow-purple/20 hover:shadow-lg hover:shadow-purple/25'
                  }
                  disabled:opacity-60
                `}
              >
                {memoryLoading && (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {memoryLoading ? '报告中...' : memoryStatus === 'success' ? '已报告' : '报告约会记忆'}
              </button>
              {memoryStatus === 'error' && (
                <p className="text-xs text-coral mt-2">报告失败，请重试</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
