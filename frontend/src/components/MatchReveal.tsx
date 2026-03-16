import type { Pairing } from '../types'

interface Props {
  pairings: Pairing[]
  round: number
  totalRounds: number
}

export function MatchReveal({ pairings, round, totalRounds }: Props) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          {totalRounds > 1 ? `Round ${round}` : 'Matches Revealed'}
        </h2>
        {totalRounds > 1 && (
          <span style={styles.roundBadge}>{pairings.length} pairs</span>
        )}
      </div>
      <div style={styles.list}>
        {pairings.map((pairing, i) => (
          <div key={pairing.id} style={{
            ...styles.card,
            animationDelay: `${i * 200}ms`,
          }}>
            <div style={styles.matchRow}>
              <div style={styles.side}>
                <span style={styles.avatar}>{pairing.agent_a.avatar_emoji || '\uD83E\uDD9E'}</span>
                <span style={styles.name}>{pairing.agent_a.name}</span>
                {pairing.agent_a.name_cn && (
                  <span style={styles.nameCn}>{pairing.agent_a.name_cn}</span>
                )}
              </div>

              <div style={styles.center}>
                <div style={styles.scoreRing}>
                  <span style={styles.scoreNum}>{pairing.compatibility_score}</span>
                </div>
                <span style={styles.scoreLabel}>compatibility</span>
              </div>

              <div style={styles.side}>
                <span style={styles.avatar}>{pairing.agent_b.avatar_emoji || '\uD83E\uDD9E'}</span>
                <span style={styles.name}>{pairing.agent_b.name}</span>
                {pairing.agent_b.name_cn && (
                  <span style={styles.nameCn}>{pairing.agent_b.name_cn}</span>
                )}
              </div>
            </div>

            <p style={styles.reasoning}>"{pairing.reasoning}"</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: 28,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#f472b6',
  },
  roundBadge: {
    fontSize: 11,
    color: '#64748b',
    background: 'rgba(255,255,255,0.04)',
    padding: '3px 10px',
    borderRadius: 12,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  card: {
    background: 'rgba(244,114,182,0.04)',
    border: '1px solid rgba(244,114,182,0.1)',
    borderRadius: 20,
    padding: '24px 28px',
    animation: 'fadeInUp 0.5s ease both',
  },
  matchRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  side: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  avatar: { fontSize: 44, marginBottom: 4 },
  name: {
    fontWeight: 700,
    fontSize: 15,
    color: '#fff',
    textAlign: 'center',
  },
  nameCn: { fontSize: 11, color: '#64748b' },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  scoreRing: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 24px rgba(236,72,153,0.3)',
  },
  scoreNum: { fontSize: 22, fontWeight: 800, color: '#fff' },
  scoreLabel: {
    fontSize: 9,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: 500,
  },
  reasoning: {
    marginTop: 18,
    fontSize: 13,
    fontStyle: 'italic',
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 1.5,
  },
}
