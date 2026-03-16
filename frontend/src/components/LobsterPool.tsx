import type { LobsterProfile } from '../types'

export function LobsterPool({ lobsters }: { lobsters: LobsterProfile[] }) {
  if (lobsters.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>🦞</div>
        <p>Waiting for lobsters to join...</p>
        <p style={styles.emptyHint}>Start the agents to begin registration</p>
      </div>
    )
  }

  return (
    <div>
      <h2 style={styles.title}>Single Lobsters</h2>
      <div style={styles.grid}>
        {lobsters.map((lobster, i) => (
          <LobsterCard key={lobster.id} lobster={lobster} delay={i * 100} />
        ))}
      </div>
    </div>
  )
}

function LobsterCard({ lobster, delay }: { lobster: LobsterProfile; delay: number }) {
  return (
    <div style={{
      ...styles.card,
      animationDelay: `${delay}ms`,
    }}>
      <div style={styles.avatar}>{lobster.avatar_emoji}</div>
      <h3 style={styles.name}>{lobster.name}</h3>
      <p style={styles.nameCn}>{lobster.name_cn}</p>
      <span style={styles.personality}>{lobster.personality_type}</span>
      <p style={styles.catchphrase}>"{lobster.catchphrase}"</p>
      <div style={styles.tags}>
        {lobster.interests.slice(0, 3).map(tag => (
          <span key={tag} style={styles.tag}>{tag}</span>
        ))}
      </div>
      <div style={styles.loveLanguage}>
        <span style={styles.heartIcon}>💝</span> {lobster.love_language}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  title: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 16,
    color: '#fbbf24',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 16,
  },
  card: {
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(10px)',
    borderRadius: 16,
    padding: 20,
    border: '1px solid rgba(255,255,255,0.1)',
    animation: 'fadeInUp 0.5s ease both',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'default',
  },
  avatar: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: 700,
    textAlign: 'center',
    color: '#fff',
  },
  nameCn: {
    fontSize: 13,
    textAlign: 'center',
    color: '#94a3b8',
    marginBottom: 8,
  },
  personality: {
    display: 'block',
    textAlign: 'center',
    fontSize: 12,
    color: '#fbbf24',
    background: 'rgba(251,191,36,0.15)',
    padding: '3px 12px',
    borderRadius: 20,
    margin: '0 auto 10px',
    width: 'fit-content',
  },
  catchphrase: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 1.4,
    marginBottom: 12,
    minHeight: 34,
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
    marginBottom: 10,
  },
  tag: {
    fontSize: 11,
    background: 'rgba(99,102,241,0.2)',
    color: '#a5b4fc',
    padding: '2px 8px',
    borderRadius: 10,
  },
  loveLanguage: {
    fontSize: 11,
    color: '#f9a8d4',
    textAlign: 'center',
  },
  heartIcon: {
    fontSize: 12,
  },
  empty: {
    textAlign: 'center',
    padding: 60,
    color: '#64748b',
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyHint: {
    fontSize: 13,
    marginTop: 8,
    color: '#475569',
  },
}
