import type { DateMessage, DateRating, Pairing } from '../types'

interface DateResult {
  id: string
  messages: DateMessage[]
  ratings: DateRating[]
}

interface Props {
  dates: DateResult[]
  pairings: Pairing[]
}

export function Scoreboard({ dates, pairings }: Props) {
  // Compute rankings
  const ranked = dates
    .map(d => {
      const avg = d.ratings.length
        ? d.ratings.reduce((s, r) => s + r.score, 0) / d.ratings.length
        : 0
      const pairing = pairings.find(p =>
        d.messages.some(m => m.sender_id === p.agent_a.id || m.sender_id === p.agent_b.id)
      )
      return { ...d, avg, pairing }
    })
    .sort((a, b) => b.avg - a.avg)

  const best = ranked[0]

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Final Results</h2>

      {/* Best Couple Award */}
      {best?.pairing && (
        <div style={styles.award}>
          <div style={styles.awardEmoji}>🏆</div>
          <div style={styles.awardTitle}>Best Couple / 最佳情侣</div>
          <div style={styles.awardCouple}>
            <span style={styles.awardAvatar}>{best.pairing.agent_a.avatar_emoji}</span>
            <span style={styles.awardName}>{best.pairing.agent_a.name}</span>
            <span style={styles.awardHeart}>❤️</span>
            <span style={styles.awardName}>{best.pairing.agent_b.name}</span>
            <span style={styles.awardAvatar}>{best.pairing.agent_b.avatar_emoji}</span>
          </div>
          <div style={styles.awardScore}>{best.avg.toFixed(1)} / 10</div>
        </div>
      )}

      {/* All Results */}
      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <span style={styles.col1}>Rank</span>
          <span style={styles.col2}>Couple</span>
          <span style={styles.col3}>Compatibility</span>
          <span style={styles.col4}>Avg Rating</span>
          <span style={styles.col5}>Messages</span>
        </div>
        {ranked.map((d, i) => (
          <div key={d.id} style={{
            ...styles.tableRow,
            background: i === 0 ? 'rgba(251,191,36,0.1)' : 'transparent',
          }}>
            <span style={styles.col1}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
            </span>
            <span style={styles.col2}>
              {d.pairing ? `${d.pairing.agent_a.name} × ${d.pairing.agent_b.name}` : 'Unknown'}
            </span>
            <span style={styles.col3}>
              {d.pairing?.compatibility_score || '—'}
            </span>
            <span style={{
              ...styles.col4,
              color: d.avg >= 8 ? '#4ade80' : d.avg >= 6 ? '#fbbf24' : '#f87171',
            }}>
              {d.avg.toFixed(1)}
            </span>
            <span style={styles.col5}>{d.messages.length}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 800,
    color: '#fbbf24',
    marginBottom: 20,
    textAlign: 'center',
  },
  award: {
    background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.1))',
    border: '2px solid rgba(251,191,36,0.3)',
    borderRadius: 20,
    padding: 30,
    textAlign: 'center',
    marginBottom: 24,
    animation: 'glow 3s infinite',
  },
  awardEmoji: {
    fontSize: 60,
    marginBottom: 8,
  },
  awardTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#fbbf24',
    marginBottom: 12,
  },
  awardCouple: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    fontSize: 18,
  },
  awardAvatar: {
    fontSize: 36,
  },
  awardName: {
    fontWeight: 700,
    color: '#fff',
  },
  awardHeart: {
    fontSize: 24,
    animation: 'pulse 1s infinite',
  },
  awardScore: {
    fontSize: 28,
    fontWeight: 800,
    color: '#fbbf24',
    marginTop: 12,
  },
  table: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    padding: '12px 20px',
    background: 'rgba(0,0,0,0.2)',
    fontSize: 12,
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tableRow: {
    display: 'flex',
    padding: '14px 20px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    fontSize: 14,
    alignItems: 'center',
  },
  col1: { width: 60 },
  col2: { flex: 1, fontWeight: 600 },
  col3: { width: 100, textAlign: 'center' },
  col4: { width: 100, textAlign: 'center', fontWeight: 700 },
  col5: { width: 80, textAlign: 'center', color: '#94a3b8' },
}
