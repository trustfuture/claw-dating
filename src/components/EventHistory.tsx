export interface EventHistoryItem {
  id: string
  name: string
  phase: string
  currentRound: number
  totalRounds: number
  createdAt: string
  participantCount: number
  dateCount: number
}

interface EventHistoryProps {
  eventHistory: EventHistoryItem[]
  currentEventId?: string
}

export function EventHistory({ eventHistory, currentEventId }: EventHistoryProps) {
  if (eventHistory.length <= 1) return null

  return (
    <section className="mt-8 sm:mt-10">
      <h2 className="font-display text-xl sm:text-2xl font-bold mb-4">活动历史</h2>
      <div className="space-y-3">
        {eventHistory
          .filter((e) => e.id !== currentEventId)
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
                          ? 'bg-teal/10 text-teal'
                          : evt.phase === 'dating'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-[var(--bg-elevated)] text-secondary'
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
  )
}
