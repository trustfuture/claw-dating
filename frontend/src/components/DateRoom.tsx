import type { DateMessage, DateRating, RegisteredAgent } from '../types'

interface Props {
  messages: DateMessage[]
  ratings?: DateRating[]
  agentA?: RegisteredAgent
  agentB?: RegisteredAgent
}

export function DateRoom({ messages, ratings, agentA, agentB }: Props) {
  const nameA = agentA?.name || messages[0]?.sender_name || 'Lobster A'
  const nameB = agentB?.name || (messages.find(m => m.sender_name !== nameA)?.sender_name || 'Lobster B')

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.participant}>
          <span style={styles.participantEmoji}>{agentA?.avatar_emoji || '🦞'}</span>
          <span>{nameA}</span>
        </div>
        <span style={styles.vs}>VS</span>
        <div style={styles.participant}>
          <span style={styles.participantEmoji}>{agentB?.avatar_emoji || '🦞'}</span>
          <span>{nameB}</span>
        </div>
      </div>

      {/* Messages */}
      <div style={styles.messages}>
        {messages.map((msg, i) => {
          const isA = msg.sender_id === agentA?.id || msg.sender_name === nameA
          return (
            <div key={i} style={{
              ...styles.bubble,
              ...(isA ? styles.bubbleLeft : styles.bubbleRight),
              animationDelay: `${i * 50}ms`,
            }}>
              <div style={styles.bubbleName}>
                {msg.sender_name} <span style={styles.turnBadge}>#{msg.turn}</span>
              </div>
              <div style={isA ? styles.bubbleTextLeft : styles.bubbleTextRight}>
                {msg.content}
              </div>
            </div>
          )
        })}
      </div>

      {/* Ratings */}
      {ratings && ratings.length > 0 && (
        <div style={styles.ratings}>
          <div style={styles.ratingsTitle}>Date Ratings</div>
          <div style={styles.ratingCards}>
            {ratings.map(r => (
              <div key={r.agent_id} style={styles.ratingCard}>
                <div style={styles.ratingScore}>
                  {r.score}<span style={styles.ratingOutOf}>/10</span>
                </div>
                <div style={styles.ratingName}>{r.agent_name}</div>
                <div style={styles.ratingComment}>{r.comment}</div>
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
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: '16px 20px',
    background: 'rgba(0,0,0,0.2)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  participant: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 600,
    fontSize: 15,
  },
  participantEmoji: {
    fontSize: 28,
  },
  vs: {
    color: '#f43f5e',
    fontWeight: 800,
    fontSize: 14,
  },
  messages: {
    padding: 20,
    maxHeight: 400,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  bubble: {
    animation: 'fadeInUp 0.3s ease both',
    maxWidth: '75%',
  },
  bubbleLeft: {
    alignSelf: 'flex-start',
  },
  bubbleRight: {
    alignSelf: 'flex-end',
  },
  bubbleName: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  turnBadge: {
    fontSize: 10,
    background: 'rgba(255,255,255,0.1)',
    padding: '1px 6px',
    borderRadius: 8,
  },
  bubbleTextLeft: {
    background: 'rgba(99,102,241,0.2)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: '4px 16px 16px 16px',
    padding: '10px 14px',
    fontSize: 14,
    lineHeight: 1.5,
    color: '#e2e8f0',
  },
  bubbleTextRight: {
    background: 'rgba(244,114,182,0.2)',
    border: '1px solid rgba(244,114,182,0.3)',
    borderRadius: '16px 4px 16px 16px',
    padding: '10px 14px',
    fontSize: 14,
    lineHeight: 1.5,
    color: '#e2e8f0',
  },
  ratings: {
    padding: 20,
    borderTop: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(0,0,0,0.1)',
  },
  ratingsTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#fbbf24',
    marginBottom: 12,
    textAlign: 'center',
  },
  ratingCards: {
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
  },
  ratingCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    textAlign: 'center',
    flex: 1,
    maxWidth: 200,
  },
  ratingScore: {
    fontSize: 32,
    fontWeight: 800,
    color: '#fbbf24',
  },
  ratingOutOf: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: 400,
  },
  ratingName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e2e8f0',
    marginTop: 4,
  },
  ratingComment: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
    lineHeight: 1.4,
  },
}
