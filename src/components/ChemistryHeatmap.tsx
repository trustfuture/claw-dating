'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'

interface ChemistryAgent {
  id: string
  name: string
  avatarEmoji: string
}

interface ChemistryEntry {
  agentAId: string
  agentBId: string
  score: number
  reasoning: string
}

interface ChemistryData {
  matrix: ChemistryEntry[]
  agents: ChemistryAgent[]
}

function scoreToEmoji(score: number): string {
  if (score >= 80) return '🔥'
  if (score >= 60) return '✨'
  if (score >= 40) return '🌤'
  if (score >= 20) return '🌥'
  return '❄️'
}

function scoreToColor(score: number): string {
  if (score >= 80) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  if (score >= 60) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
  if (score >= 40) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
  if (score >= 20) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
  return 'bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400'
}

function scoreToBorder(score: number): string {
  if (score >= 80) return 'border-red-200 dark:border-red-800'
  if (score >= 60) return 'border-orange-200 dark:border-orange-800'
  if (score >= 40) return 'border-yellow-200 dark:border-yellow-800'
  return 'border-transparent'
}

export function ChemistryHeatmap() {
  const [data, setData] = useState<ChemistryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [selectedPair, setSelectedPair] = useState<ChemistryEntry | null>(null)

  const fetchChemistry = useCallback(() => {
    fetch('/api/agents/chemistry')
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchChemistry()
  }, [fetchChemistry])

  // Build lookup map for quick pair access
  const pairMap = useMemo(() => {
    if (!data) return new Map<string, ChemistryEntry>()
    const map = new Map<string, ChemistryEntry>()
    for (const entry of data.matrix) {
      map.set(`${entry.agentAId}:${entry.agentBId}`, entry)
      map.set(`${entry.agentBId}:${entry.agentAId}`, entry)
    }
    return map
  }, [data])

  // Top pairs for collapsed view
  const topPairs = useMemo(() => {
    if (!data) return []
    return [...data.matrix].sort((a, b) => b.score - a.score).slice(0, 5)
  }, [data])

  const getAgentName = useCallback(
    (id: string) => data?.agents.find((a) => a.id === id),
    [data]
  )

  if (loading) return null
  if (!data || data.agents.length < 2) return null

  const agents = data.agents

  return (
    <section className="mb-8 sm:mb-10">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-semibold text-secondary hover:text-[var(--text-primary)] transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        化学反应预测
        <span className="text-xs font-normal text-muted">
          ({agents.length} 位嘉宾)
        </span>
      </button>

      {expanded && (
        <div className="mt-3 bg-white dark:bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border)] p-4 sm:p-6 shadow-sm animate-slide-in">
          {/* Top matches summary */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              最佳化学反应 TOP 5
            </h3>
            <div className="space-y-1.5">
              {topPairs.map((pair) => {
                const a = getAgentName(pair.agentAId)
                const b = getAgentName(pair.agentBId)
                if (!a || !b) return null
                return (
                  <button
                    key={`${pair.agentAId}-${pair.agentBId}`}
                    onClick={() => setSelectedPair(selectedPair?.agentAId === pair.agentAId && selectedPair?.agentBId === pair.agentBId ? null : pair)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200 text-left ${
                      selectedPair?.agentAId === pair.agentAId && selectedPair?.agentBId === pair.agentBId
                        ? 'bg-purple/10 border border-purple/20'
                        : 'hover:bg-[var(--bg-elevated)] dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="text-base">{a.avatarEmoji}</span>
                    <span className="font-medium truncate max-w-[5rem]">{a.name}</span>
                    <span className="text-muted">×</span>
                    <span className="text-base">{b.avatarEmoji}</span>
                    <span className="font-medium truncate max-w-[5rem]">{b.name}</span>
                    <span className="ml-auto flex items-center gap-1 flex-shrink-0">
                      <span>{scoreToEmoji(pair.score)}</span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${scoreToColor(pair.score)}`}>
                        {pair.score}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Selected pair reasoning */}
          {selectedPair && (
            <div className="mb-4 px-3 py-2.5 rounded-xl bg-purple/5 border border-purple/10 text-sm">
              <span className="text-muted">红娘点评：</span>
              <span className="text-[var(--text-primary)]">{selectedPair.reasoning}</span>
            </div>
          )}

          {/* Heatmap grid */}
          {agents.length <= 15 && (
            <div className="overflow-x-auto -mx-2 px-2">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                全员化学反应矩阵
              </h3>
              <div className="inline-block min-w-full">
                <table className="border-collapse">
                  <thead>
                    <tr>
                      <th className="w-8 h-8" />
                      {agents.map((a) => (
                        <th
                          key={a.id}
                          className="w-10 h-10 text-center text-base"
                          title={a.name}
                        >
                          {a.avatarEmoji}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((row) => (
                      <tr key={row.id}>
                        <td
                          className="w-10 h-10 text-center text-base"
                          title={row.name}
                        >
                          {row.avatarEmoji}
                        </td>
                        {agents.map((col) => {
                          if (row.id === col.id) {
                            return (
                              <td
                                key={col.id}
                                className="w-10 h-10 text-center bg-[var(--bg-elevated)] dark:bg-white/5 rounded"
                              >
                                <span className="text-xs text-muted">—</span>
                              </td>
                            )
                          }
                          const entry = pairMap.get(`${row.id}:${col.id}`)
                          if (!entry) return <td key={col.id} className="w-10 h-10" />
                          return (
                            <td
                              key={col.id}
                              className={`w-10 h-10 text-center cursor-pointer rounded border ${scoreToBorder(entry.score)} transition-all duration-150 hover:scale-110`}
                              title={`${row.name} × ${col.name}: ${entry.score}分`}
                              onClick={() => setSelectedPair(entry)}
                            >
                              <span className="text-sm">{scoreToEmoji(entry.score)}</span>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-[var(--border)]">
            <span className="text-xs text-muted">图例：</span>
            {[
              { emoji: '🔥', label: '超配 80+' },
              { emoji: '✨', label: '很配 60+' },
              { emoji: '🌤', label: '还行 40+' },
              { emoji: '🌥', label: '一般 20+' },
              { emoji: '❄️', label: '冷场 <20' },
            ].map((item) => (
              <span key={item.emoji} className="flex items-center gap-1 text-xs text-secondary">
                <span>{item.emoji}</span>
                <span>{item.label}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
