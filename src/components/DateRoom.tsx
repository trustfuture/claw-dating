'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageBubble } from '@/components/MessageBubble'
import { StatusBadge } from '@/components/StatusBadge'

interface DateRoomProps {
  date: {
    id: string
    status: string
    round: number
    startedAt?: string
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
      createdAt?: string
    }[]
    ratings: {
      agentName: string
      score: number
      comment: string
    }[]
    errorMessage?: string
    failedAtTurn?: number
  }
  onRun: () => void
  onCancel?: () => void
  running: boolean
}

export function DateRoom({ date, onRun, onCancel, running }: DateRoomProps) {
  const { pairing, messages, ratings, status } = date
  const { agentA, agentB } = pairing
  const isError = status === 'error' || status === 'failed'
  const isCancelled = status === 'cancelled'
  const isActive = status === 'in_progress'
  const isCompleted = status === 'completed'
  const canCancel = (status === 'in_progress' || status === 'pending') && onCancel
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const headerContent = (
    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
      <span className="text-xl sm:text-2xl">{agentA.avatarEmoji}</span>
      <span className="text-xs sm:text-sm font-semibold">{agentA.name}</span>
      <span className="text-coral text-base sm:text-lg mx-0.5 sm:mx-1">&hearts;</span>
      <span className="text-xs sm:text-sm font-semibold">{agentB.name}</span>
      <span className="text-xl sm:text-2xl">{agentB.avatarEmoji}</span>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
        {isCompleted ? (
          <a href={`/dates/${date.id}`} className="hover:opacity-70 transition-opacity">
            {headerContent}
          </a>
        ) : (
          headerContent
        )}
        <div className="flex items-center gap-2 sm:gap-3">
          {pairing.compatibilityScore > 0 && (
            <span className="text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-gold/10 text-gold font-medium">
              匹配度 {pairing.compatibilityScore}%
            </span>
          )}
          {isActive && messages.length > 0 && (
            <span className="text-[10px] sm:text-xs text-muted font-medium tabular-nums">
              {messages.length} 消息
            </span>
          )}
          {isActive && <ElapsedTimer startedAt={date.startedAt} />}
          <StatusBadge status={status} />
          {isCompleted && (
            <a
              href={`/dates/${date.id}`}
              className="text-[10px] sm:text-xs text-purple hover:underline font-medium"
            >
              查看详情
            </a>
          )}
          {canCancel && (
            <button
              onClick={onCancel}
              aria-label={`取消 ${agentA.name} 和 ${agentB.name} 的约会`}
              className="text-[10px] sm:text-xs px-2 py-0.5 rounded-lg border border-[var(--border)] text-muted hover:text-coral hover:border-coral/30 transition-colors"
            >
              取消约会
            </button>
          )}
        </div>
      </div>

      {/* Matching reasoning */}
      {pairing.reasoning && (
        <div className="px-4 sm:px-6 py-2 sm:py-2.5 border-b border-[var(--border)] bg-gold/5">
          <p className="text-[11px] sm:text-xs text-secondary">
            <span className="font-semibold text-gold">匹配理由：</span>
            {pairing.reasoning}
          </p>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 ? (
        <div className="px-3 sm:px-6 py-3 sm:py-4 max-h-80 overflow-y-auto space-y-2.5 sm:space-y-3">
          {messages.map((msg, i) => {
            const isA = msg.senderName === agentA.name
            return (
              <MessageBubble
                key={i}
                senderName={msg.senderName}
                senderEmoji={isA ? agentA.avatarEmoji : agentB.avatarEmoji}
                content={msg.content}
                isRight={!isA}
                timestamp={msg.createdAt}
              />
            )
          })}
          {isActive && running && messages.length > 0 && (
            <div className="flex gap-2 items-center px-1 py-1">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[10px] text-muted">对话中...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      ) : isActive && running ? (
        /* Loading skeleton */
        <div className="px-3 sm:px-6 py-3 sm:py-4 space-y-2.5 sm:space-y-3" aria-busy="true">
          <SkeletonMessage align="left" />
          <SkeletonMessage align="right" />
          <SkeletonMessage align="left" wide />
          <SkeletonMessage align="right" />
        </div>
      ) : isCancelled ? (
        <div className="px-4 sm:px-6 py-8 sm:py-10 text-center">
          <p className="text-muted text-sm">这场约会已被取消</p>
        </div>
      ) : status === 'pending' ? (
        <div className="px-4 sm:px-6 py-8 sm:py-10 text-center">
          <p className="text-muted text-sm mb-4">约会还未开始</p>
          <button
            onClick={onRun}
            disabled={running}
            aria-label={`开始 ${agentA.name} 和 ${agentB.name} 的约会`}
            className="
              w-full sm:w-auto
              px-6 py-2.5 rounded-xl text-sm font-semibold text-white
              bg-gradient-to-r from-coral to-[#c43a2f]
              shadow-md shadow-coral/20 disabled:opacity-50
              transition-all duration-200 flex items-center justify-center gap-2 mx-auto
            "
          >
            {running && <SpinnerIcon />}
            {running ? '进行中...' : '开始约会'}
          </button>
        </div>
      ) : isError && messages.length === 0 ? (
        <div className="px-4 sm:px-6 py-8 sm:py-10 text-center">
          <ErrorIcon />
          <p className="text-coral text-sm font-medium mt-3 mb-1">
            {date.errorMessage || '约会中断了'}
          </p>
          {date.failedAtTurn !== undefined && (
            <p className="text-xs text-muted mb-4">在第 {date.failedAtTurn} 轮对话时失败</p>
          )}
          {!date.failedAtTurn && <div className="mb-4" />}
          <button
            onClick={onRun}
            disabled={running}
            className="
              w-full sm:w-auto
              px-6 py-2.5 rounded-xl text-sm font-semibold text-white
              bg-gradient-to-r from-coral to-[#c43a2f]
              shadow-md shadow-coral/20 disabled:opacity-50
              transition-all duration-200 flex items-center justify-center gap-2 mx-auto
            "
          >
            {running && <SpinnerIcon />}
            {running ? '重试中...' : '重新开始'}
          </button>
        </div>
      ) : (
        <div className="px-4 sm:px-6 py-8 sm:py-10 text-center text-muted text-sm">
          约会进行中...
        </div>
      )}

      {isError && messages.length > 0 && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-[var(--border)] bg-coral/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-coral flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-xs sm:text-sm text-coral font-medium">
                {date.errorMessage || '这场约会中途失败了，可以保留记录后重新开始。'}
              </p>
            </div>
            {date.failedAtTurn !== undefined && (
              <p className="text-[10px] sm:text-xs text-coral/70 mt-1 ml-6">
                在第 {date.failedAtTurn} 轮对话时失败
              </p>
            )}
          </div>
          <button
            onClick={onRun}
            disabled={running}
            className="
              w-full sm:w-auto flex-shrink-0
              px-4 py-2 rounded-xl text-sm font-semibold text-white
              bg-gradient-to-r from-coral to-[#c43a2f]
              shadow-md shadow-coral/20 disabled:opacity-50
              transition-all duration-200 flex items-center justify-center gap-2
            "
          >
            {running && <SpinnerIcon />}
            {running ? '重试中...' : '重新开始'}
          </button>
        </div>
      )}

      {/* Ratings */}
      {ratings.length > 0 && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-[var(--border)] bg-[var(--bg)]/50">
          <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">
            互评结果
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {ratings.map((r, i) => (
              <div key={i} className="flex items-start gap-2 sm:gap-3">
                <div className="text-xl sm:text-2xl font-display font-bold text-coral">
                  {r.score}
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold">{r.agentName} 的评价</div>
                  <div className="text-[10px] sm:text-xs text-muted mt-0.5 line-clamp-2">{r.comment}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ElapsedTimer({ startedAt }: { startedAt?: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = startedAt ? new Date(startedAt).getTime() : Date.now()
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return (
    <span className="text-[10px] sm:text-xs text-purple font-medium tabular-nums">
      已进行 {elapsed}s
    </span>
  )
}

function SkeletonMessage({ align, wide }: { align: 'left' | 'right'; wide?: boolean }) {
  return (
    <div className={`flex gap-2 sm:gap-3 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--bg-elevated)] animate-pulse-gentle flex-shrink-0" />
      <div
        className={`
          ${wide ? 'w-[65%] sm:w-[55%]' : 'w-[50%] sm:w-[40%]'}
          rounded-2xl animate-pulse-gentle
          ${align === 'left' ? 'bg-[var(--bg-elevated)] rounded-tl-sm' : 'bg-purple/5 rounded-tr-sm'}
        `}
      >
        <div className="px-3 sm:px-4 py-2 sm:py-2.5">
          <div className="h-2.5 w-12 bg-[var(--border)] rounded mb-2" />
          <div className="h-3 w-full bg-[var(--border)] rounded mb-1" />
          {wide && <div className="h-3 w-3/4 bg-[var(--border)] rounded" />}
        </div>
      </div>
    </div>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg className="w-10 h-10 text-coral mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}
