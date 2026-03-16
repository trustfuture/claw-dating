import { useEffect, useRef } from 'react'

interface Props {
  events: { text: string; time: string }[]
}

export function EventTimeline({ events }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events.length])

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
            animation: i === events.length - 1 ? 'slideIn 0.3s ease' : 'none',
          }}>
            <div style={styles.dotCol}>
              <span style={{
                ...styles.dot,
                background: i === events.length - 1 ? '#ec4899' : '#334155',
              }} />
              {i < events.length - 1 && <div style={styles.line} />}
            </div>
            <div style={styles.content}>
              <div style={styles.text}>{e.text}</div>
              <div style={styles.time}>{e.time}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 16,
    border: '1px solid rgba(255,255,255,0.06)',
    maxHeight: 'calc(100vh - 160px)',
    overflowY: 'auto',
    position: 'sticky',
    top: 80,
  },
  title: {
    fontSize: 11,
    fontWeight: 700,
    color: '#475569',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  item: {
    display: 'flex',
    gap: 10,
    minHeight: 36,
  },
  dotCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 12,
    flexShrink: 0,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    marginTop: 5,
    flexShrink: 0,
  },
  line: {
    width: 1,
    flex: 1,
    background: 'rgba(255,255,255,0.04)',
    marginTop: 4,
  },
  content: {
    paddingBottom: 8,
  },
  text: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 1.4,
  },
  time: {
    fontSize: 10,
    color: '#334155',
    marginTop: 2,
  },
  empty: {
    fontSize: 12,
    color: '#334155',
    textAlign: 'center',
    padding: 24,
  },
}
