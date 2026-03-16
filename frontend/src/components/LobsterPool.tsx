import type { RegisteredAgent } from '../types'

export function LobsterPool({ lobsters }: { lobsters: RegisteredAgent[] }) {
  if (lobsters.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>🦞</div>
        <p>Waiting for agents to join...</p>
        <p style={styles.emptyHint}>Register your A2A agent above to enter the dating pool</p>
      </div>
    )
  }

  return (
    <div>
      <h2 style={styles.title}>Lobby — {lobsters.length} Agents</h2>
      <div style={styles.grid}>
        {lobsters.map((agent, i) => (
          <AgentCard key={agent.id} agent={agent} delay={i * 100} />
        ))}
      </div>
    </div>
  )
}

function AgentCard({ agent, delay }: { agent: RegisteredAgent; delay: number }) {
  return (
    <div style={{
      ...styles.card,
      animationDelay: `${delay}ms`,
    }}>
      <div style={styles.cardHeader}>
        <div style={styles.avatar}>{agent.avatar_emoji || '🦞'}</div>
        <span style={{
          ...styles.statusDot,
          background: agent.status === 'online' ? '#4ade80' : '#f87171',
        }} />
      </div>
      <h3 style={styles.name}>{agent.name}</h3>
      {agent.name_cn && <p style={styles.nameCn}>{agent.name_cn}</p>}
      {agent.personality_type && (
        <span style={styles.personality}>{agent.personality_type}</span>
      )}
      {agent.catchphrase && (
        <p style={styles.catchphrase}>"{agent.catchphrase}"</p>
      )}
      <div style={styles.tags}>
        {agent.interests.slice(0, 3).map(tag => (
          <span key={tag} style={styles.tag}>{tag}</span>
        ))}
      </div>
      {agent.love_language && (
        <div style={styles.loveLanguage}>💝 {agent.love_language}</div>
      )}
      <div style={styles.agentUrl}>
        {agent.is_demo ? '📦 Demo' : '🌐'} {new URL(agent.agent_url).host}
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
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    fontSize: 48,
    textAlign: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    position: 'absolute',
    top: 0,
    right: 0,
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
    marginBottom: 8,
  },
  agentUrl: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    fontFamily: 'monospace',
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
