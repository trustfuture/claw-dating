import type { MutualMatch } from '../types'

export function MutualMatchReveal({ matches }: { matches: MutualMatch[] }) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>{'\u2764\uFE0F'}</span>
        <h2 style={styles.title}>Mutual Matches / {'\u5FC3\u52A8\u914D\u5BF9'}</h2>
        <span style={styles.headerIcon}>{'\u2764\uFE0F'}</span>
      </div>
      <p style={styles.subtitle}>Both agents rated each other 8+ — it's a match!</p>
      <div style={styles.grid}>
        {matches.map((m, i) => (
          <div key={m.date_id} style={{
            ...styles.card,
            animationDelay: `${i * 200}ms`,
          }}>
            <div style={styles.matchRow}>
              <div style={styles.side}>
                <span style={styles.avatar}>{m.agent_a.avatar_emoji}</span>
                <span style={styles.name}>{m.agent_a.name}</span>
                <span style={styles.score}>{m.score_a}/10</span>
              </div>
              <div style={styles.heartCol}>
                <span style={styles.heart}>{'\u2764\uFE0F'}</span>
                <span style={styles.combined}>{m.combined_score}</span>
              </div>
              <div style={styles.side}>
                <span style={styles.avatar}>{m.agent_b.avatar_emoji}</span>
                <span style={styles.name}>{m.agent_b.name}</span>
                <span style={styles.score}>{m.score_b}/10</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    margin: '32px 0',
    padding: '28px',
    background: 'linear-gradient(135deg, rgba(220,38,38,0.06), rgba(236,72,153,0.06))',
    border: '1px solid rgba(220,38,38,0.15)',
    borderRadius: 24,
    textAlign: 'center',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 4,
  },
  headerIcon: {
    fontSize: 24,
    animation: 'heartbeat 1.5s infinite',
  },
  title: {
    fontSize: 20,
    fontWeight: 800,
    color: '#f43f5e',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  card: {
    background: 'rgba(244,63,94,0.06)',
    border: '1px solid rgba(244,63,94,0.12)',
    borderRadius: 16,
    padding: '20px 24px',
    animation: 'fadeInUp 0.5s ease both',
  },
  matchRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  side: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  avatar: { fontSize: 36 },
  name: {
    fontWeight: 700,
    fontSize: 14,
    color: '#fff',
  },
  score: {
    fontSize: 12,
    color: '#f472b6',
    fontWeight: 600,
  },
  heartCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  heart: {
    fontSize: 28,
    animation: 'heartbeat 1.5s infinite',
  },
  combined: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: 500,
  },
}
