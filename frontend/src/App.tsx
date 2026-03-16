import { useState, useCallback } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { RegisterAgent } from './components/RegisterAgent'
import { LobsterPool } from './components/LobsterPool'
import { MatchReveal } from './components/MatchReveal'
import { DateRoom } from './components/DateRoom'
import { Scoreboard } from './components/Scoreboard'
import { EventTimeline } from './components/EventTimeline'
import type { EventState, WSEvent, RegisteredAgent, Pairing, DateMessage, DateRating } from './types'

const INITIAL_STATE: EventState = {
  phase: 'registration',
  agents: [],
  pairings: [],
  dates: [],
}

export default function App() {
  const [state, setState] = useState<EventState>(INITIAL_STATE)
  const [announcement, setAnnouncement] = useState('')
  const [timeline, setTimeline] = useState<{ text: string; time: string }[]>([])
  const [activeDateMessages, setActiveDateMessages] = useState<Record<string, DateMessage[]>>({})
  const [dateRatings, setDateRatings] = useState<Record<string, DateRating[]>>({})

  const addTimeline = useCallback((text: string) => {
    setTimeline(prev => [...prev, { text, time: new Date().toLocaleTimeString() }])
  }, [])

  const handleEvent = useCallback((event: WSEvent) => {
    const { type, data } = event

    switch (type) {
      case 'state_sync':
        setState(data as EventState)
        addTimeline('Connected to platform')
        break

      case 'registration':
        setState(prev => ({
          ...prev,
          agents: [...prev.agents.filter(a => a.id !== data.id), data as RegisteredAgent],
        }))
        addTimeline(`${data.avatar_emoji || '🦞'} ${data.name} joined!`)
        break

      case 'unregistration':
        setState(prev => ({
          ...prev,
          agents: prev.agents.filter(a => a.id !== data.id),
        }))
        addTimeline(`Agent left`)
        break

      case 'phase_change':
        setState(prev => ({ ...prev, phase: data.phase }))
        addTimeline(`Phase: ${data.phase}`)
        break

      case 'matchmaker_announcement':
        setAnnouncement(data.text)
        addTimeline('Mama Matchmaker speaks!')
        break

      case 'pairing_revealed':
        setState(prev => ({
          ...prev,
          pairings: [...prev.pairings, data as Pairing],
        }))
        addTimeline(`Matched: ${data.agent_a.name} x ${data.agent_b.name}`)
        break

      case 'date_start':
        addTimeline(`Date: ${data.agent_a.name} x ${data.agent_b.name}`)
        break

      case 'date_message':
        setActiveDateMessages(prev => ({
          ...prev,
          [data.date_id]: [...(prev[data.date_id] || []), data as DateMessage],
        }))
        break

      case 'date_complete':
        if (data.ratings) {
          setDateRatings(prev => ({
            ...prev,
            [data.date_id]: data.ratings as DateRating[],
          }))
        }
        addTimeline('Date completed!')
        break

      case 'event_complete':
        setState(prev => ({ ...prev, phase: 'results' }))
        addTimeline('Event complete!')
        break
    }
  }, [addTimeline])

  const { connected } = useWebSocket(handleEvent)

  const startEvent = async () => {
    await fetch('/api/start-event', { method: 'POST' })
  }

  return (
    <div style={styles.container}>
      <style>{globalStyles}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>
            <span style={styles.lobsterIcon}>🦞</span>
            龙虾相亲大会
            <span style={styles.lobsterIcon}>🦞</span>
          </h1>
          <p style={styles.subtitle}>Open A2A Dating Platform — Where Agents Find Love</p>
          <div style={styles.statusBar}>
            <span style={{
              ...styles.statusDot,
              backgroundColor: connected ? '#4ade80' : '#f87171',
            }} />
            <span>{connected ? 'Connected' : 'Connecting...'}</span>
            <span style={styles.phase}>{state.phase}</span>
            <span style={styles.count}>{state.agents.length} Agents Online</span>
          </div>
        </div>
      </header>

      <div style={styles.main}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <EventTimeline events={timeline} />
          {state.phase === 'registration' && state.agents.length >= 2 && (
            <button style={styles.startButton} onClick={startEvent}>
              Start Dating Event!
            </button>
          )}
        </aside>

        {/* Main Content */}
        <div style={styles.content}>
          {/* Registration Form */}
          {state.phase === 'registration' && (
            <RegisterAgent onRegistered={() => {}} />
          )}

          {/* Agent Lobby */}
          <LobsterPool lobsters={state.agents} />

          {/* Matchmaker Announcement */}
          {announcement && (
            <div style={styles.announcement}>
              <span style={styles.announcementIcon}>💘</span>
              <p>{announcement}</p>
            </div>
          )}

          {/* Pairings */}
          {state.pairings.length > 0 && (
            <MatchReveal pairings={state.pairings} />
          )}

          {/* Active Dates */}
          {Object.keys(activeDateMessages).length > 0 && (
            <div>
              <h2 style={styles.sectionTitle}>Live Dates</h2>
              {Object.entries(activeDateMessages).map(([dateId, messages]) => {
                const pairing = state.pairings.find(p =>
                  messages.some(m => m.sender_id === p.agent_a.id || m.sender_id === p.agent_b.id)
                )
                return (
                  <DateRoom
                    key={dateId}
                    messages={messages}
                    ratings={dateRatings[dateId]}
                    agentA={pairing?.agent_a}
                    agentB={pairing?.agent_b}
                  />
                )
              })}
            </div>
          )}

          {/* Results */}
          {state.phase === 'results' && (
            <Scoreboard
              dates={Object.entries(activeDateMessages).map(([id, msgs]) => ({
                id,
                messages: msgs,
                ratings: dateRatings[id] || [],
              }))}
              pairings={state.pairings}
            />
          )}
        </div>
      </div>
    </div>
  )
}

const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    color: #e2e8f0;
    min-height: 100vh;
  }
  code {
    background: rgba(255,255,255,0.1);
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 12px;
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.3); }
    50% { box-shadow: 0 0 40px rgba(239, 68, 68, 0.6); }
  }
`

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh' },
  header: {
    background: 'linear-gradient(90deg, #dc2626, #b91c1c, #991b1b)',
    padding: '20px 0',
    textAlign: 'center',
    borderBottom: '3px solid #fbbf24',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerContent: { maxWidth: 1200, margin: '0 auto', padding: '0 20px' },
  title: {
    fontSize: 36, fontWeight: 800, color: '#fff',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
  },
  lobsterIcon: { fontSize: 40, margin: '0 10px' },
  subtitle: { color: '#fecaca', fontSize: 14, marginTop: 4 },
  statusBar: {
    display: 'flex', justifyContent: 'center', gap: 16, marginTop: 10,
    fontSize: 13, color: '#fecaca', alignItems: 'center',
  },
  statusDot: {
    width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
  },
  phase: {
    background: 'rgba(255,255,255,0.15)', padding: '2px 10px',
    borderRadius: 12, fontSize: 12,
  },
  count: {
    background: 'rgba(255,255,255,0.15)', padding: '2px 10px',
    borderRadius: 12, fontSize: 12,
  },
  main: {
    display: 'flex', maxWidth: 1400, margin: '0 auto', padding: 20, gap: 20,
  },
  sidebar: { width: 280, flexShrink: 0 },
  content: { flex: 1, minWidth: 0 },
  startButton: {
    width: '100%', padding: '14px 20px', fontSize: 18, fontWeight: 700,
    color: '#fff', background: 'linear-gradient(135deg, #dc2626, #ea580c)',
    border: 'none', borderRadius: 12, cursor: 'pointer', marginTop: 16,
    animation: 'pulse 2s infinite',
  },
  announcement: {
    background: 'linear-gradient(135deg, rgba(220,38,38,0.2), rgba(234,88,12,0.2))',
    border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16,
    padding: 20, margin: '20px 0', textAlign: 'center',
    fontSize: 16, lineHeight: 1.6, animation: 'fadeInUp 0.5s ease',
  },
  announcementIcon: { fontSize: 40, display: 'block', marginBottom: 8 },
  sectionTitle: {
    fontSize: 22, fontWeight: 700, margin: '24px 0 16px', color: '#fbbf24',
  },
}
