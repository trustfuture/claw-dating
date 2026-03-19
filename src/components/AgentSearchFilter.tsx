'use client'

interface AgentSearchFilterProps {
  search: string
  onSearchChange: (value: string) => void
  personalityTypes: string[]
  activePersonalities: Set<string>
  onTogglePersonality: (type: string) => void
  sortMode: 'newest' | 'name'
  onSortChange: (mode: 'newest' | 'name') => void
}

export function AgentSearchFilter({
  search,
  onSearchChange,
  personalityTypes,
  activePersonalities,
  onTogglePersonality,
  sortMode,
  onSortChange,
}: AgentSearchFilterProps) {
  return (
    <div className="space-y-3 mb-4 sm:mb-6">
      {/* Search bar */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜索 Agent（名字、性格、兴趣...）"
          aria-label="搜索 Agent"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-purple/20 focus:border-purple/30 transition-all"
        />
      </div>

      {/* Filter chips + sort */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        {personalityTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 flex-1">
            {personalityTypes.map((type) => (
              <button
                key={type}
                onClick={() => onTogglePersonality(type)}
                aria-pressed={activePersonalities.has(type)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activePersonalities.has(type)
                    ? 'bg-purple text-white'
                    : 'bg-[var(--bg-elevated)] text-secondary hover:bg-purple/10'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        )}

        <select
          value={sortMode}
          onChange={(e) => onSortChange(e.target.value as 'newest' | 'name')}
          aria-label="排序方式"
          className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-white text-xs text-secondary focus:outline-none focus:ring-2 focus:ring-purple/20 sm:ml-auto flex-shrink-0"
        >
          <option value="newest">最新加入</option>
          <option value="name">名字</option>
        </select>
      </div>
    </div>
  )
}
