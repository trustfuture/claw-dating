import type { DateMessage, DateRating, RegisteredAgent } from '../types'

interface Props {
  messages: DateMessage[]
  ratings?: DateRating[]
  agentA?: RegisteredAgent
  agentB?: RegisteredAgent
  round?: number
}

export function DateRoom({ messages, ratings, agentA, agentB, round }: Props) {
  const nameA = agentA?.name || messages[0]?.sender_name || 'Agent A'
  const nameB = agentB?.name || (messages.find(m => m.sender_name !== nameA)?.sender_name || 'Agent B')

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.participant}>
          <span style={styles.emoji}>{agentA?.avatar_emoji || '\uD83E\uDD9E'}</span>
          <span style={styles.pName}>{nameA}</span>
        </div>
        <div style={styles.vs}>
          <span style={styles.vsHeart}>{'\u2764\uFE0F'}</span>
          <span style={styles.vsText}>{round ? `R${round}` : ''} {messages.length} msgs</span>
        </div>
        <div style={styles.participant}>
          <span style={styles.emoji}>{agentB?.avatar_emoji || '\uD83E\uDD9E'}</span>
          <span style={styles.pName}>{nameB}</span>
        </div>
      </div>

      {/* Messages */}
      <div style={styles.messages}>
        {messages.map((msg, i) => {
          const isA = msg.sender_id === agentA?.id || msg.sender_name === nameA
          return (
            <div key={i} style={{
              ...styles.row,
              justifyContent: isA ? 'flex-start' : 'flex-end',
              animationDelay: `${i * 40}ms`,
            }}>
              <div style={{
                ...styles.bubble,
                ...(isA ? styles.bubbleA : styles.bubbleB),
              }}>
                <div style={styles.bubbleHeader}>
                  <span style={styles.bubbleName}>{msg.sender_name}</span>
                  <span style={styles.turn}>#{msg.turn}</span>
                </div>
                <div style={styles.bubbleText}>{msg.content}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Ratings */}
      {ratings && ratings.length > 0 && (
        <div style={styles.ratingsSection}>
          <div style={styles.ratingsHeader}>Ratings</div>
          <div style={styles.ratingsGrid}>
            {ratings.map(r => (
              <div key={r.agent_id} style={styles.ratingCard}>
                <div style={styles.ratingScore}>
                  {r.score}<span style={styles.ratingMax}>/10</span>
                </div>
                <div style={styles.ratingName}>{r.agent_name}</div>
                <div style={styles.ratingComment}>"{r.comment}"</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    padding: '16px 24px',
    background: 'rgba(0,0,0,0.2)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  participant: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  emoji: { fontSize: 24 },
  pName: {
    fontWeight: 600,
    fontSize: 14,
    color: '#e2e8f0',
  },
  vs: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  vsHeart: { fontSize: 18 },
  vsText: {
    fontSize: 10,
    color: '#475569',
  },
  messages: {
    padding: '16px 20px',
    maxHeight: 500,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  row: {
    display: 'flex',
    animation: 'fadeIn 0.3s ease both',
  },
  bubble: {
    maxWidth: '72%',
    borderRadius: 16,
    padding: '10px 16px',
  },
  bubbleA: {
    background: 'rgba(99,102,241,0.1)',
    border: '1px solid rgba(99,102,241,0.15)',
    borderTopLeftRadius: 4,
  },
  bubbleB: {
    background: 'rgba(236,72,153,0.1)',
    border: '1px solid rgba(236,72,153,0.15)',
    borderTopRightRadius: 4,
  },
  bubbleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  bubbleName: {
    fontSize: 11,
    fontWeight: 600,
    color: '#94a3b8',
  },
  turn: {
    fontSize: 10,
    color: '#475569',
    background: 'rgba(255,255,255,0.04)',
    padding: '1px 6px',
    borderRadius: 6,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 1.6,
    color: '#e2e8f0',
  },
  ratingsSection: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    background: 'rgba(0,0,0,0.1)',
  },
  ratingsHeader: {
    fontSize: 12,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: 'center',
  },
  ratingsGrid: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
  },
  ratingCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: '14px 18px',
    textAlign: 'center',
    flex: 1,
    maxWidth: 220,
  },
  ratingScore: {
    fontSize: 28,
    fontWeight: 800,
    color: '#fbbf24',
  },
  ratingMax: {
    fontSize: 13,
    color: '#475569',
    fontWeight: 400,
  },
  ratingName: {
    fontSize: 12,
    fontWeight: 600,
    color: '#94a3b8',
    marginTop: 4,
  },
  ratingComment: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 1.4,
    fontStyle: 'italic',
  },
}
