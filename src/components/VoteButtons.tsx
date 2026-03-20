'use client'

import { useState, useEffect, useCallback } from 'react'

interface VoteCounts {
  chemistry: number
  not_feeling_it: number
}

export function VoteButtons({ dateSessionId }: { dateSessionId: string }) {
  const [counts, setCounts] = useState<VoteCounts>({ chemistry: 0, not_feeling_it: 0 })
  const [userVote, setUserVote] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const fetchVotes = useCallback(() => {
    fetch(`/api/dates/${dateSessionId}/vote`)
      .then((r) => r.json())
      .then((data) => {
        setCounts(data.counts || { chemistry: 0, not_feeling_it: 0 })
        setUserVote(data.userVote ?? null)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [dateSessionId])

  useEffect(() => {
    fetchVotes()
  }, [fetchVotes])

  const handleVote = async (voteType: string) => {
    if (voting) return
    setVoting(true)

    try {
      const res = await fetch(`/api/dates/${dateSessionId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType }),
      })

      if (res.status === 401) {
        // Not logged in — silently ignore
        return
      }

      if (res.ok) {
        const data = await res.json()
        setCounts(data.counts)
        setUserVote(data.vote.voteType)
      }
    } catch {
      // Ignore network errors
    } finally {
      setVoting(false)
    }
  }

  if (!loaded) return null

  const total = counts.chemistry + counts.not_feeling_it

  return (
    <div className="flex items-center gap-2 mt-2">
      <button
        onClick={() => handleVote('chemistry')}
        disabled={voting}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
          userVote === 'chemistry'
            ? 'bg-pink-100 text-pink-700 border border-pink-300 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700'
            : 'bg-[var(--bg-elevated)] text-secondary border border-[var(--border)] hover:bg-pink-50 hover:border-pink-200 dark:hover:bg-pink-900/20'
        } disabled:opacity-50`}
        title="有火花！"
      >
        <span>🔥</span>
        <span>{counts.chemistry}</span>
      </button>

      <button
        onClick={() => handleVote('not_feeling_it')}
        disabled={voting}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
          userVote === 'not_feeling_it'
            ? 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
            : 'bg-[var(--bg-elevated)] text-secondary border border-[var(--border)] hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20'
        } disabled:opacity-50`}
        title="不太行"
      >
        <span>❄️</span>
        <span>{counts.not_feeling_it}</span>
      </button>

      {total > 0 && (
        <span className="text-[10px] text-muted ml-1">
          {total} 票
        </span>
      )}
    </div>
  )
}
