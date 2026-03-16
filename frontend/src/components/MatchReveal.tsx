import type { Pairing } from '../types'

export function MatchReveal({ pairings }: { pairings: Pairing[] }) {
  return (
    <div>
      <h2 style={styles.title}>Matches Revealed</h2>
      <div style={styles.list}>
        {pairings.map((pairing, i) => (
          <div key={pairing.id} style={{
            ...styles.card,
            animationDelay: `${i * 200}ms`,
          }}>
            <div style={styles.matchHeader}>
              <div style={styles.lobsterSide}>
                <span style={styles.avatar}>{pairing.lobster_a.avatar_emoji}</span>
                <span style={styles.matchName}>{pairing.lobster_a.name}</span>
                <span style={styles.matchNameCn}>{pairing.lobster_a.name_cn}</span>
              </div>

              <div style={styles.heartCenter}>
                <div style={styles.scoreCircle}>
                  <span style={styles.scoreNum}>{pairing.compatibility_score}</span>
                  <span style={styles.scoreLabel}>match</span>
                </div>
              </div>

              <div style={styles.lobsterSide}>
                <span style={styles.avatar}>{pairing.lobster_b.avatar_emoji}</span>
                <span style={styles.matchName}>{pairing.lobster_b.name}</span>
                <span style={styles.matchNameCn}>{pairing.lobster_b.name_cn}</span>
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
  title: {
    fontSize: 22,
    fontWeight: 700,
    margin: '24px 0 16px',
    color: '#f472b6',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  card: {
    background: 'linear-gradient(135deg, rgba(244,114,182,0.1), rgba(251,113,133,0.1))',
    border: '1px solid rgba(244,114,182,0.2)',
    borderRadius: 16,
    padding: 24,
    animation: 'fadeInUp 0.6s ease both',
  },
  matchHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  lobsterSide: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    fontSize: 48,
    marginBottom: 4,
  },
  matchName: {
    fontWeight: 700,
    fontSize: 16,
    color: '#fff',
  },
  matchNameCn: {
    fontSize: 12,
    color: '#94a3b8',
  },
  heartCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 70,
    height: 70,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'glow 2s infinite',
  },
  scoreNum: {
    fontSize: 22,
    fontWeight: 800,
    color: '#fff',
  },
  scoreLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  reasoning: {
    marginTop: 16,
    fontSize: 13,
    fontStyle: 'italic',
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 1.5,
  },
}
