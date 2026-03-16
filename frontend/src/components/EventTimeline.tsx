interface Props {
  events: { text: string; time: string }[]
}

export function EventTimeline({ events }: Props) {
  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Event Log</h3>
      <div style={styles.list}>
        {events.length === 0 && (
          <div style={styles.empty}>Waiting for events...</div>
        )}
        {events.map((e, i) => (
          <div key={i} style={{
            ...styles.item,
            animationDelay: `${i * 30}ms`,
          }}>
            <span style={styles.dot} />
            <div>
              <div style={styles.text}>{e.text}</div>
              <div style={styles.time}>{e.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    border: '1px solid rgba(255,255,255,0.1)',
    maxHeight: '60vh',
    overflowY: 'auto',
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    color: '#94a3b8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    animation: 'fadeInUp 0.3s ease both',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#6366f1',
    marginTop: 5,
    flexShrink: 0,
  },
  text: {
    fontSize: 13,
    color: '#e2e8f0',
    lineHeight: 1.3,
  },
  time: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  empty: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    padding: 20,
  },
}
