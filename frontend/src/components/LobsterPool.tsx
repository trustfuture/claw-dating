import type { RegisteredAgent } from '../types'

export function LobsterPool({ agents }: { agents: RegisteredAgent[] }) {
  if (agents.length === 0) return null

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Lobby</h2>
        <span style={styles.count}>{agents.length} agent{agents.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={styles.grid}>
        {agents.map((agent, i) => (
          <AgentCard key={agent.id} agent={agent} delay={i * 80} />
        ))}
      </div>
    </div>
  )
}

function AgentCard({ agent, delay }: { agent: RegisteredAgent; delay: number }) {
  let hostDisplay = ''
  if (agent.agent_url) {
    try {
      hostDisplay = new URL(agent.agent_url).host
    } catch {
      hostDisplay = agent.agent_url
    }
  }

  const mode = agent.agent_url ? 'A2A' : 'Polling'

  return (
    <div style={{
      ...styles.card,
      animationDelay: `${delay}ms`,
    }}>
      <div style={styles.cardTop}>
        <div style={styles.avatar}>{agent.avatar_emoji || '\uD83E\uDD9E'}</div>
        <div style={styles.modeBadge}>
          <span style={{
            ...styles.modeDot,
            background: mode === 'A2A' ? '#6366f1' : '#22c55e',
          }} />
          {mode}
        </div>
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
        {(agent.interests || []).slice(0, 4).map(tag => (
          <span key={tag} style={styles.tag}>{tag}</span>
        ))}
      </div>
      {agent.love_language && (
        <div style={styles.loveLanguage}>{'\uD83D\uDC9D'} {agent.love_language}</div>
      )}
      {hostDisplay && (
        <div style={styles.agentUrl}>{hostDisplay}</div>
      )}
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
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#e2e8f0',
  },
  count: {
    fontSize: 12,
    color: '#64748b',
    background: 'rgba(255,255,255,0.04)',
    padding: '4px 12px',
    borderRadius: 20,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 14,
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 20,
    border: '1px solid rgba(255,255,255,0.06)',
    animation: 'fadeInUp 0.4s ease both',
    transition: 'border-color 0.2s, background 0.2s',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  avatar: {
    fontSize: 40,
  },
  modeBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: '#64748b',
    background: 'rgba(255,255,255,0.04)',
    padding: '3px 8px',
    borderRadius: 8,
    fontWeight: 500,
  },
  modeDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
  },
  name: {
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 2,
  },
  nameCn: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  personality: {
    display: 'inline-block',
    fontSize: 11,
    color: '#f472b6',
    background: 'rgba(244,114,182,0.1)',
    padding: '3px 10px',
    borderRadius: 20,
    marginBottom: 10,
    fontWeight: 500,
  },
  catchphrase: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#94a3b8',
    lineHeight: 1.4,
    marginBottom: 12,
    minHeight: 34,
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 10,
  },
  tag: {
    fontSize: 10,
    background: 'rgba(99,102,241,0.1)',
    color: '#a5b4fc',
    padding: '2px 8px',
    borderRadius: 8,
    fontWeight: 500,
  },
  loveLanguage: {
    fontSize: 11,
    color: '#f9a8d4',
    marginBottom: 6,
  },
  agentUrl: {
    fontSize: 10,
    color: '#334155',
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    marginTop: 4,
  },
}
