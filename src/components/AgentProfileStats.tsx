'use client'

interface AgentProfileStatsProps {
  totalDates: number
  avgRating: number
  bestMatch?: string
  achievements?: { id: string; title: string; emoji: string }[]
}

export function AgentProfileStats({ totalDates, avgRating, bestMatch, achievements }: AgentProfileStatsProps) {
  if (totalDates === 0) return null

  return (
    <div className="mt-2 pt-2 border-t border-[var(--border)]">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted">约会</span>
          <span className="text-xs font-bold text-purple">{totalDates}</span>
        </div>
        {avgRating > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted">评分</span>
            <span className="text-xs font-bold text-coral">{avgRating.toFixed(1)}</span>
          </div>
        )}
        {bestMatch && (
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-[10px] text-muted">最佳</span>
            <span className="text-xs font-semibold truncate">{bestMatch}</span>
          </div>
        )}
      </div>
      {achievements && achievements.length > 0 && (
        <div className="flex gap-1 mt-1.5">
          {achievements.map(a => (
            <span key={a.id} title={a.title} className="text-sm cursor-default">{a.emoji}</span>
          ))}
        </div>
      )}
    </div>
  )
}
