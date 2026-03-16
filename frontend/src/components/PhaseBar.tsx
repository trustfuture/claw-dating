import type { EventPhase } from '../types'

const PHASES: { key: EventPhase; label: string; labelCn: string; icon: string }[] = [
  { key: 'registration', label: 'Registration', labelCn: '\u6CE8\u518C', icon: '\uD83D\uDCDD' },
  { key: 'matching', label: 'Matching', labelCn: '\u914D\u5BF9', icon: '\uD83D\uDC98' },
  { key: 'dating', label: 'Dating', labelCn: '\u7EA6\u4F1A', icon: '\uD83D\uDCAC' },
  { key: 'results', label: 'Results', labelCn: '\u7ED3\u679C', icon: '\uD83C\uDFC6' },
]

export function PhaseBar({ phase }: { phase: EventPhase }) {
  const currentIdx = PHASES.findIndex(p => p.key === phase)

  return (
    <div style={styles.bar}>
      <div style={styles.inner}>
        {PHASES.map((p, i) => {
          const isActive = p.key === phase
          const isDone = i < currentIdx
          return (
            <div key={p.key} style={styles.step}>
              {i > 0 && (
                <div style={{
                  ...styles.line,
                  background: isDone
                    ? 'linear-gradient(90deg, #dc2626, #ec4899)'
                    : 'rgba(255,255,255,0.06)',
                }} />
              )}
              <div style={{
                ...styles.dot,
                ...(isActive ? styles.dotActive : isDone ? styles.dotDone : styles.dotPending),
              }}>
                <span style={styles.dotIcon}>{p.icon}</span>
              </div>
              <div style={styles.labelGroup}>
                <span style={{
                  ...styles.label,
                  color: isActive ? '#fff' : isDone ? '#94a3b8' : '#475569',
                  fontWeight: isActive ? 700 : 500,
                }}>
                  {p.label}
                </span>
                <span style={{
                  ...styles.labelCn,
                  color: isActive ? '#f472b6' : '#334155',
                }}>
                  {p.labelCn}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    background: 'rgba(255,255,255,0.02)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    padding: '16px 0',
  },
  inner: {
    maxWidth: 600,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
  },
  line: {
    width: 60,
    height: 2,
    borderRadius: 1,
    marginRight: 0,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.3s',
  },
  dotActive: {
    background: 'linear-gradient(135deg, #dc2626, #ec4899)',
    boxShadow: '0 0 20px rgba(220,38,38,0.4)',
  },
  dotDone: {
    background: 'rgba(220,38,38,0.2)',
    border: '1px solid rgba(220,38,38,0.3)',
  },
  dotPending: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  dotIcon: { fontSize: 16 },
  labelGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginLeft: 8,
    marginRight: 8,
  },
  label: { fontSize: 12 },
  labelCn: { fontSize: 10 },
}
