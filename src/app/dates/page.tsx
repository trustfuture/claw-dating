'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/Navbar'
import { DateRoom } from '@/components/DateRoom'
import { useToast } from '@/components/Toast'

interface DateData {
  id: string
  status: string
  round: number
  createdAt?: string
  startedAt?: string
  pairing: {
    id: string
    agentA: { id: string; name: string; avatarEmoji: string }
    agentB: { id: string; name: string; avatarEmoji: string }
    compatibilityScore: number
  }
  messages: {
    id: string
    senderName: string
    content: string
    turn: number
  }[]
  ratings: {
    agentId: string
    agentName: string
    score: number
    comment: string
  }[]
  errorMessage?: string
}

type FetchStatus = 'connected' | 'error' | 'idle'

interface EventData {
  id: string
  currentRound: number
  totalRounds: number
  dates: DateData[]
}

type DateRunEvent =
  | { type: 'status'; data: { message?: string } }
  | { type: 'message'; data: { senderId: string; senderName: string; content: string; turn: number } }
  | { type: 'rating'; data: { ratings?: DateData['ratings'] } }
  | { type: 'complete'; data: { message?: string; dateSessionId?: string } }
  | { type: 'error'; data: { message?: string } }

async function readJsonError(response: Response) {
  try {
    const data = await response.json()
    if (typeof data?.error === 'string' && data.error) {
      return data.error
    }
  } catch {
    // Ignore JSON parse failures and fall back to status text.
  }

  return response.statusText || '请求失败'
}

function parseSseEvent(block: string): DateRunEvent | null {
  const lines = block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return null

  let eventType = 'message'
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventType = line.slice('event:'.length).trim()
      continue
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trim())
    }
  }

  if (dataLines.length === 0) return null

  try {
    return {
      type: eventType as DateRunEvent['type'],
      data: JSON.parse(dataLines.join('\n')),
    } as DateRunEvent
  } catch {
    return null
  }
}

async function consumeSse(
  response: Response,
  onEvent: (event: DateRunEvent) => void
) {
  if (!response.body) {
    throw new Error('约会流不可用')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })

    let separatorIndex = buffer.indexOf('\n\n')
    while (separatorIndex >= 0) {
      const block = buffer.slice(0, separatorIndex)
      buffer = buffer.slice(separatorIndex + 2)

      const event = parseSseEvent(block)
      if (event) onEvent(event)

      separatorIndex = buffer.indexOf('\n\n')
    }

    if (done) {
      const finalEvent = parseSseEvent(buffer)
      if (finalEvent) onEvent(finalEvent)
      break
    }
  }
}

export default function DatesPage() {
  const { user, loading } = useAuth()
  const [dates, setDates] = useState<DateData[]>([])
  const [event, setEvent] = useState<EventData | null>(null)
  const [runningDateIds, setRunningDateIds] = useState<string[]>([])
  const [actionPending, setActionPending] = useState(false)
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle')
  const failCountRef = useRef(0)
  const [showError, setShowError] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    if (!loading && !user) window.location.href = '/'
  }, [loading, user])

  const fetchEvent = useCallback(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((data) => {
        if (data.event) {
          setEvent(data.event as EventData)
          setDates((data.event as EventData).dates || [])
        }
        setFetchStatus('connected')
        failCountRef.current = 0
        setShowError(false)
      })
      .catch(() => {
        failCountRef.current += 1
        setFetchStatus('error')
        if (failCountRef.current >= 3) {
          setShowError(true)
        }
      })
  }, [])

  useEffect(() => {
    fetchEvent()
    const interval = setInterval(fetchEvent, 3000)
    return () => clearInterval(interval)
  }, [fetchEvent])

  const retryFetch = () => {
    failCountRef.current = 0
    setShowError(false)
    setFetchStatus('idle')
    fetchEvent()
  }

  const patchDate = useCallback((dateId: string, updater: (date: DateData) => DateData) => {
    setDates((prev) =>
      prev.map((date) => (date.id === dateId ? updater(date) : date))
    )
  }, [])

  const markDateRunning = useCallback((dateId: string) => {
    setRunningDateIds((prev) => (prev.includes(dateId) ? prev : [...prev, dateId]))
  }, [])

  const clearRunningDate = useCallback((dateId: string) => {
    setRunningDateIds((prev) => prev.filter((id) => id !== dateId))
  }, [])

  const runDate = useCallback(async (dateId: string) => {
    try {
      const res = await fetch(`/api/dates/${dateId}/run`, { method: 'POST' })
      if (!res.ok) {
        throw new Error(await readJsonError(res))
      }

      markDateRunning(dateId)
      patchDate(dateId, (date) => ({
        ...date,
        status: 'in_progress',
        startedAt: date.startedAt || new Date().toISOString(),
        messages: [],
        ratings: [],
        errorMessage: '',
      }))

      await consumeSse(res, (event) => {
        if (event.type === 'status') {
          patchDate(dateId, (date) => ({
            ...date,
            status: 'in_progress',
            startedAt: date.startedAt || new Date().toISOString(),
            errorMessage: '',
          }))
          return
        }

        if (event.type === 'message') {
          patchDate(dateId, (date) => {
            const alreadyExists = date.messages.some(
              (message) => message.turn === event.data.turn
            )
            if (alreadyExists) return date

            return {
              ...date,
              status: 'in_progress',
              messages: [
                ...date.messages,
                {
                  id: `${dateId}-${event.data.turn}`,
                  senderName: event.data.senderName,
                  content: event.data.content,
                  turn: event.data.turn,
                },
              ].sort((a, b) => a.turn - b.turn),
            }
          })
          return
        }

        if (event.type === 'rating') {
          patchDate(dateId, (date) => ({
            ...date,
            ratings: event.data.ratings || [],
          }))
          return
        }

        if (event.type === 'complete') {
          patchDate(dateId, (date) => ({
            ...date,
            status: 'completed',
            errorMessage: '',
          }))
          return
        }

        if (event.type === 'error') {
          patchDate(dateId, (date) => ({
            ...date,
            status: 'error',
            errorMessage: event.data.message || '约会过程中出现错误',
          }))
        }
      })

      fetchEvent()
    } catch (error) {
      const message = error instanceof Error ? error.message : '网络错误，请重试'
      patchDate(dateId, (date) => ({
        ...date,
        status: date.messages.length > 0 ? 'error' : 'pending',
        errorMessage: message,
      }))
      addToast('error', message)
    } finally {
      clearRunningDate(dateId)
    }
  }, [addToast, clearRunningDate, fetchEvent, markDateRunning, patchDate])

  const runAllDates = async () => {
    const pendingDates = dates.filter((d) => d.status === 'pending')
    setActionPending(true)
    try {
      for (const d of pendingDates) {
        await runDate(d.id)
      }
    } finally {
      setActionPending(false)
    }
  }

  // Round-based grouping
  const totalRounds = event?.totalRounds || Math.max(...dates.map((d) => d.round || 1), 1)
  const currentRound = event?.currentRound || Math.max(...dates.map((d) => d.round || 1), 1)

  const datesByRound = useMemo(() => {
    const grouped: Record<number, DateData[]> = {}
    for (const d of dates) {
      const r = d.round || 1
      if (!grouped[r]) grouped[r] = []
      grouped[r].push(d)
    }
    return grouped
  }, [dates])

  const roundNumbers = useMemo(
    () => Object.keys(datesByRound).map(Number).sort((a, b) => a - b),
    [datesByRound]
  )

  // Check if current round dates are all done
  const currentRoundDates = datesByRound[currentRound] || []
  const currentRoundAllDone = currentRoundDates.length > 0 && currentRoundDates.every(
    (d) => d.status === 'completed' || d.status === 'error' || d.status === 'failed'
  )
  const hasMoreRounds = currentRound < totalRounds
  const allRoundsDone = currentRoundAllDone && !hasMoreRounds

  const pendingCount = dates.filter((d) => d.status === 'pending').length
  const completedCount = dates.filter((d) => d.status === 'completed').length
  const running = actionPending || runningDateIds.length > 0

  const startNextRound = async () => {
    if (!event?.id) return
    setActionPending(true)
    try {
      const res = await fetch(`/api/events/${event.id}/start`, { method: 'POST' })
      if (res.ok) {
        fetchEvent()
      } else {
        addToast('error', '启动下一轮失败，请重试')
      }
    } catch {
      addToast('error', '网络错误，请重试')
    } finally {
      setActionPending(false)
    }
  }

  const endEvent = async () => {
    if (!event?.id) return
    setActionPending(true)
    try {
      const res = await fetch(`/api/events/${event.id}/start`, { method: 'POST' })
      if (res.ok) {
        window.location.href = '/scoreboard'
      } else {
        addToast('error', '结束活动失败，请重试')
      }
    } catch {
      addToast('error', '网络错误，请重试')
    } finally {
      setActionPending(false)
    }
  }

  // Connection status dot
  const statusDot = fetchStatus === 'connected'
    ? 'bg-teal'
    : fetchStatus === 'error'
      ? 'bg-coral'
      : 'bg-gray-300'

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Error banner */}
        {showError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-coral/10 border border-coral/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p className="text-coral text-sm">连接失败，无法获取最新数据</p>
            <button
              onClick={retryFetch}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-coral hover:bg-coral/90 transition-colors flex-shrink-0"
            >
              重试
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl font-bold">约会进行中</h1>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`} title={fetchStatus === 'connected' ? '已连接' : fetchStatus === 'error' ? '连接失败' : '连接中'} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-secondary text-sm">
                {completedCount}/{dates.length} 场约会已完成
              </p>
              {totalRounds > 1 && (
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-purple/10 text-purple font-medium">
                  第 {currentRound} 轮 / 共 {totalRounds} 轮
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            {pendingCount > 0 && (
              <button
                onClick={runAllDates}
                disabled={running}
                className="
                  w-full sm:w-auto
                  px-6 py-2.5 rounded-xl font-semibold text-sm text-white
                  bg-gradient-to-r from-coral to-[#c43a2f]
                  shadow-lg shadow-coral/20 disabled:opacity-50
                  transition-all duration-200
                "
              >
                {running ? '约会中...' : `开始全部约会 (${pendingCount})`}
              </button>
            )}
            {currentRoundAllDone && hasMoreRounds && pendingCount === 0 && (
              <button
                onClick={startNextRound}
                disabled={running}
                className="
                  w-full sm:w-auto
                  px-6 py-2.5 rounded-xl font-semibold text-sm text-white
                  bg-gradient-to-r from-purple to-[#6c3fc4]
                  shadow-lg shadow-purple/20 disabled:opacity-50
                  transition-all duration-200
                "
              >
                {running ? '准备中...' : '下一轮'}
              </button>
            )}
            {allRoundsDone && pendingCount === 0 && (
              <button
                onClick={endEvent}
                disabled={running}
                className="
                  w-full sm:w-auto
                  px-6 py-2.5 rounded-xl font-semibold text-sm text-white
                  bg-gradient-to-r from-gold to-[#c49236]
                  shadow-lg shadow-gold/20 disabled:opacity-50
                  transition-all duration-200
                "
              >
                {running ? '处理中...' : '结束活动'}
              </button>
            )}
            {pendingCount === 0 && !currentRoundAllDone && dates.length > 0 && completedCount === dates.length && (
              <a
                href="/scoreboard"
                className="
                  w-full sm:w-auto text-center
                  px-6 py-2.5 rounded-xl font-semibold text-sm text-white
                  bg-gradient-to-r from-gold to-[#c49236]
                  shadow-lg shadow-gold/20 transition-all duration-200
                "
              >
                查看结果
              </a>
            )}
          </div>
        </div>

        {/* Date rooms */}
        {dates.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <div className="text-5xl mb-4">💑</div>
            <p>还没有约会，先去大厅开始配对吧</p>
            <a href="/lobby" className="text-purple text-sm font-medium mt-2 inline-block">
              前往大厅 &rarr;
            </a>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {roundNumbers.map((roundNum) => (
              <div key={roundNum}>
                {/* Round header */}
                {roundNumbers.length > 1 && (() => {
                  const roundDates = datesByRound[roundNum] || []
                  const doneCount = roundDates.filter((d) => d.status === 'completed' || d.status === 'error' || d.status === 'failed').length
                  const pct = roundDates.length > 0 ? (doneCount / roundDates.length) * 100 : 0
                  return (
                    <div className="mb-3 sm:mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="font-display text-base sm:text-lg font-bold text-secondary whitespace-nowrap">
                          第 {roundNum} 轮
                        </h3>
                        <span className="text-[10px] text-muted">{doneCount}/{roundDates.length}</span>
                        <div className="h-px flex-1 bg-[var(--border)]" />
                      </div>
                      {roundDates.length > 0 && pct < 100 && (
                        <div className="mt-1.5 h-1 rounded-full bg-[var(--border)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-purple to-teal transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })()}

                <div className="space-y-4 sm:space-y-6">
                  {(datesByRound[roundNum] || []).map((date) => (
                    <DateRoom
                      key={date.id}
                      date={date}
                      onRun={() => runDate(date.id)}
                      running={runningDateIds.includes(date.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
