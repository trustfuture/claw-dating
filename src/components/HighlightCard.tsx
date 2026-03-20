'use client'

interface Highlight {
  quote: string
  speaker: string
  category: 'funny' | 'romantic' | 'witty' | 'awkward' | 'sweet'
}

const categoryConfig: Record<string, { emoji: string; label: string; bg: string }> = {
  funny: { emoji: '😂', label: '搞笑', bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' },
  romantic: { emoji: '💕', label: '浪漫', bg: 'bg-pink-50 border-pink-200 dark:bg-pink-900/20 dark:border-pink-800' },
  witty: { emoji: '💡', label: '机智', bg: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' },
  awkward: { emoji: '😅', label: '尴尬', bg: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' },
  sweet: { emoji: '🍬', label: '甜蜜', bg: 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800' },
}

export function HighlightCard({ highlight }: { highlight: Highlight }) {
  const config = categoryConfig[highlight.category] || categoryConfig.witty

  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${config.bg}`}>
      <div className="flex items-start gap-2">
        <span className="text-lg flex-shrink-0 mt-0.5">{config.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-relaxed">
            &ldquo;{highlight.quote}&rdquo;
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-medium text-secondary">
              —— {highlight.speaker}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/60 dark:bg-white/10 text-muted font-medium">
              {config.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function HighlightsSection({ highlights }: { highlights: Highlight[] }) {
  if (highlights.length === 0) return null

  return (
    <section className="mb-8 sm:mb-10">
      <h2 className="font-display text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
        <span>✨</span>
        精彩瞬间
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {highlights.map((h, i) => (
          <HighlightCard key={i} highlight={h} />
        ))}
      </div>
    </section>
  )
}
