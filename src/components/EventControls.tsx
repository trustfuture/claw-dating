'use client'

interface EventControlsProps {
  agent: boolean
  agentCount: number
  hasStartedEvent: boolean
  event: { id: string; phase: string; dates: { id: string }[] } | null
  totalRounds: number
  setTotalRounds: (n: number) => void
  turnsPerAgent: number
  setTurnsPerAgent: (n: number) => void
  starting: boolean
  onStartClick: () => void
  onResetClick: () => void
}

export function EventControls({
  agent,
  agentCount,
  hasStartedEvent,
  event,
  totalRounds,
  setTotalRounds,
  turnsPerAgent,
  setTurnsPerAgent,
  starting,
  onStartClick,
  onResetClick,
}: EventControlsProps) {
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
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
      {/* Round & turns selectors - only show when can start */}
      {agent && agentCount >= 2 && !hasStartedEvent && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-secondary whitespace-nowrap">轮数</span>
            <div className="flex rounded-xl border border-[var(--border)] overflow-hidden">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setTotalRounds(n)}
                  aria-pressed={totalRounds === n}
                  aria-label={`${n} 轮`}
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-secondary whitespace-nowrap">对话轮</span>
            <div className="flex rounded-xl border border-[var(--border)] overflow-hidden">
              {[3, 5, 8].map((n) => (
                <button
                  key={n}
                  onClick={() => setTurnsPerAgent(n)}
                  aria-pressed={turnsPerAgent === n}
                  aria-label={`${n} 轮对话`}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    turnsPerAgent === n
                      ? 'bg-purple text-white'
                      : 'bg-white text-secondary hover:bg-purple/5'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {agent && agentCount >= 2 && !hasStartedEvent && (
        <button
          onClick={onStartClick}
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
      {agent && event?.phase === 'dating' && (
        <button
          onClick={onResetClick}
          className="
            w-full sm:w-auto
            px-4 py-2.5 rounded-xl text-xs font-semibold
            border border-[var(--border)] text-secondary
            hover:bg-[var(--bg-elevated)] transition-colors
          "
        >
          重置活动
        </button>
      )}
      {agent && agentCount >= 2 && primaryAction && (
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
      {event && hasStartedEvent && (
        <a
          href={`/watch/${event.id}`}
          className="
            w-full sm:w-auto text-center
            px-4 py-2.5 rounded-xl text-xs font-semibold
            border border-[var(--border)] text-secondary
            hover:bg-[var(--bg-elevated)] transition-colors
          "
        >
          观战链接
        </a>
      )}
    </div>
  )
}
