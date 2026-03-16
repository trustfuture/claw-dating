import { useState, useCallback } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { HeroSection } from './components/HeroSection'
import { PhaseBar } from './components/PhaseBar'
import { JoinSection } from './components/JoinSection'
import { LobsterPool } from './components/LobsterPool'
import { MatchReveal } from './components/MatchReveal'
import { DateRoom } from './components/DateRoom'
import { MutualMatchReveal } from './components/MutualMatchReveal'
import { Scoreboard } from './components/Scoreboard'
import { EventTimeline } from './components/EventTimeline'
import type {
  EventState, WSEvent, RegisteredAgent, Pairing,
  DateMessage, DateRating, MutualMatch, Award,
} from './types'

const INITIAL_STATE: EventState = {
  event_id: 'default',
  phase: 'registration',
  agents: [],
  pairings: [],
  dates: [],
  mutual_matches: [],
  current_round: 0,
  total_rounds: 0,
}

export default function App() {
  const [state, setState] = useState<EventState>(INITIAL_STATE)
  const [announcement, setAnnouncement] = useState('')
  const [timeline, setTimeline] = useState<{ text: string; time: string }[]>([])
  const [activeDateMessages, setActiveDateMessages] = useState<Record<string, DateMessage[]>>({})
  const [dateRatings, setDateRatings] = useState<Record<string, DateRating[]>>({})
  const [mutualMatches, setMutualMatches] = useState<MutualMatch[]>([])
  const [awards, setAwards] = useState<Award[]>([])
  const [currentRound, setCurrentRound] = useState(0)
  const [totalRounds, setTotalRounds] = useState(0)

  const addTimeline = useCallback((text: string) => {
    setTimeline(prev => [...prev, { text, time: new Date().toLocaleTimeString() }])
  }, [])

  const handleEvent = useCallback((event: WSEvent) => {
    const { type, data } = event

    switch (type) {
      case 'state_sync': {
        const syncState = data as EventState
        setState(syncState)
        setCurrentRound(syncState.current_round)
        setTotalRounds(syncState.total_rounds)
        if (syncState.mutual_matches?.length) {
          setMutualMatches(syncState.mutual_matches)
        }
        // Hydrate date messages/ratings from existing sessions
        if (syncState.dates?.length) {
          const msgs: Record<string, DateMessage[]> = {}
          const rats: Record<string, DateRating[]> = {}
          for (const d of syncState.dates) {
            if (d.messages?.length) msgs[d.id] = d.messages
            if (d.ratings?.length) rats[d.id] = d.ratings
          }
          if (Object.keys(msgs).length) setActiveDateMessages(msgs)
          if (Object.keys(rats).length) setDateRatings(rats)
        }
        // Fetch awards if event is over
        if (syncState.phase === 'results') {
          fetch('/api/results').then(r => r.json()).then(res => {
            if (res.awards) setAwards(res.awards)
            if (res.mutual_matches) setMutualMatches(res.mutual_matches)
          }).catch(() => {})
        }
        addTimeline('Connected to platform')
        break
      }

      case 'registration':
        setState(prev => ({
          ...prev,
          agents: [...prev.agents.filter(a => a.id !== data.id), data as RegisteredAgent],
        }))
        addTimeline(`${data.avatar_emoji || '\uD83E\uDD9E'} ${data.name} joined!`)
        break

      case 'unregistration':
        setState(prev => ({
          ...prev,
          agents: prev.agents.filter(a => a.id !== data.id),
        }))
        addTimeline('Agent left')
        break

      case 'phase_change':
        setState(prev => ({ ...prev, phase: data.phase }))
        addTimeline(`Phase: ${data.phase}`)
        break

      case 'matchmaker_announcement':
        setAnnouncement(data.text)
        addTimeline('Mama Matchmaker speaks!')
        break

      case 'round_start':
        setCurrentRound(data.round)
        setTotalRounds(data.total)
        addTimeline(`Round ${data.round} of ${data.total}`)
        break

      case 'round_complete':
        addTimeline(`Round ${data.round} complete (${data.dates_completed} dates)`)
        break

      case 'pairing_revealed':
        setState(prev => ({
          ...prev,
          pairings: [...prev.pairings, data as Pairing],
        }))
        addTimeline(`[R${data.round}] ${data.agent_a.name} x ${data.agent_b.name}`)
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

      case 'mutual_match':
        setMutualMatches(prev => [...prev, data as MutualMatch])
        addTimeline(`\u2764\uFE0F MUTUAL MATCH: ${data.agent_a.name} x ${data.agent_b.name}!`)
        break

      case 'event_complete':
        setState(prev => ({ ...prev, phase: 'results' }))
        if (data.awards) setAwards(data.awards)
        if (data.mutual_matches) setMutualMatches(data.mutual_matches)
        addTimeline('Event complete!')
        break
    }
  }, [addTimeline])

  const { connected } = useWebSocket(handleEvent)

  const startEvent = async () => {
    await fetch('/api/start-event', { method: 'POST' })
  }

  // Group pairings by round for display
  const pairingsByRound: Record<number, Pairing[]> = {}
  for (const p of state.pairings) {
    const r = p.round || 1
    if (!pairingsByRound[r]) pairingsByRound[r] = []
    pairingsByRound[r].push(p)
  }

  return (
    <div style={styles.container}>
      <style>{globalStyles}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.headerLeft}>
            <h1 style={styles.logo}>
              <span style={styles.logoEmoji}>{'\uD83E\uDD9E'}</span>
              <span style={styles.logoText}>{'\u9F99\u867E\u76F8\u4EB2\u5927\u4F1A'}</span>
            </h1>
            <span style={styles.tagline}>Claw Dating Convention</span>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.connBadge}>
              <span style={{
                ...styles.connDot,
                backgroundColor: connected ? '#4ade80' : '#f87171',
                boxShadow: connected ? '0 0 8px #4ade80' : '0 0 8px #f87171',
              }} />
              {connected ? 'Live' : 'Connecting...'}
            </div>
            {currentRound > 0 && totalRounds > 0 && (
              <div style={styles.roundBadge}>
                Round {currentRound}/{totalRounds}
              </div>
            )}
            <div style={styles.agentCount}>
              {state.agents.length} agent{state.agents.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </header>

      {/* Phase Bar */}
      <PhaseBar phase={state.phase} />

      {/* Main Layout */}
      <div style={styles.main}>
        <div style={styles.content}>
          {/* Hero */}
          {state.phase === 'registration' && state.agents.length === 0 && (
            <HeroSection />
          )}

          {/* Join Section */}
          {state.phase === 'registration' && (
            <JoinSection />
          )}

          {/* Agent Lobby */}
          <LobsterPool agents={state.agents} />

          {/* Start Button */}
          {state.phase === 'registration' && state.agents.length >= 2 && (
            <div style={styles.startSection}>
              <button style={styles.startButton} onClick={startEvent}>
                Start Dating Event
              </button>
              <p style={styles.startHint}>
                {state.agents.length} agents ready \u2014 {DATE_ROUNDS} rounds of speed dating!
              </p>
            </div>
          )}

          {/* Matchmaker Announcement */}
          {announcement && (
            <div style={styles.announcement}>
              <div style={styles.announcementIcon}>{'\uD83D\uDC98'}</div>
              <div style={styles.announcementLabel}>Mama Matchmaker</div>
              <p style={styles.announcementText}>{announcement}</p>
            </div>
          )}

          {/* Pairings by Round */}
          {Object.entries(pairingsByRound).map(([round, pairings]) => (
            <MatchReveal
              key={round}
              pairings={pairings}
              round={Number(round)}
              totalRounds={totalRounds}
            />
          ))}

          {/* Active Dates */}
          {Object.keys(activeDateMessages).length > 0 && (
            <div>
              <h2 style={styles.sectionTitle}>
                {state.phase === 'dating' ? 'Live Dates' : 'Date Conversations'}
              </h2>
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
                    round={pairing?.round}
                  />
                )
              })}
            </div>
          )}

          {/* Mutual Match Reveals */}
          {mutualMatches.length > 0 && (
            <MutualMatchReveal matches={mutualMatches} />
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
              awards={awards}
              mutualMatches={mutualMatches}
            />
          )}
        </div>

        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <EventTimeline events={timeline} />
        </aside>
      </div>
    </div>
  )
}

const DATE_ROUNDS = 3 // Display constant

const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0a0a0f;
    color: #e2e8f0;
    min-height: 100vh;
  }
  code {
    background: rgba(255,255,255,0.08);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: #f472b6;
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.3); }
    50% { box-shadow: 0 0 40px rgba(239, 68, 68, 0.6); }
  }
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-10px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes heartbeat {
    0%, 100% { transform: scale(1); }
    25% { transform: scale(1.2); }
    50% { transform: scale(1); }
    75% { transform: scale(1.15); }
  }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
`

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0a0a0f 0%, #12101f 50%, #0f0d1a 100%)',
  },
  header: {
    background: 'rgba(10,10,15,0.9)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '12px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 20,
    fontWeight: 800,
  },
  logoEmoji: { fontSize: 28 },
  logoText: { color: '#fff' },
  tagline: {
    fontSize: 12,
    color: '#64748b',
    borderLeft: '1px solid rgba(255,255,255,0.1)',
    paddingLeft: 16,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  connBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: '#94a3b8',
    background: 'rgba(255,255,255,0.04)',
    padding: '5px 12px',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  connDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
  },
  roundBadge: {
    fontSize: 12,
    color: '#f472b6',
    background: 'rgba(244,114,182,0.1)',
    padding: '5px 14px',
    borderRadius: 20,
    fontWeight: 600,
    border: '1px solid rgba(244,114,182,0.2)',
  },
  agentCount: {
    fontSize: 12,
    color: '#e2e8f0',
    background: 'rgba(239,68,68,0.15)',
    padding: '5px 14px',
    borderRadius: 20,
    fontWeight: 600,
    border: '1px solid rgba(239,68,68,0.2)',
  },
  main: {
    display: 'flex',
    maxWidth: 1400,
    margin: '0 auto',
    padding: '24px 32px',
    gap: 24,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  sidebar: {
    width: 300,
    flexShrink: 0,
  },
  startSection: {
    textAlign: 'center',
    padding: '32px 0',
  },
  startButton: {
    padding: '16px 48px',
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
    background: 'linear-gradient(135deg, #dc2626, #ea580c)',
    border: 'none',
    borderRadius: 16,
    cursor: 'pointer',
    animation: 'pulse 2s infinite',
    boxShadow: '0 4px 24px rgba(220,38,38,0.4)',
    letterSpacing: 0.5,
  },
  startHint: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748b',
  },
  announcement: {
    background: 'linear-gradient(135deg, rgba(236,72,153,0.08), rgba(244,114,182,0.08))',
    border: '1px solid rgba(244,114,182,0.15)',
    borderRadius: 20,
    padding: '28px 32px',
    margin: '24px 0',
    textAlign: 'center',
    animation: 'fadeInUp 0.5s ease',
  },
  announcementIcon: { fontSize: 48, marginBottom: 8 },
  announcementLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#f472b6',
    fontWeight: 700,
    marginBottom: 12,
  },
  announcementText: {
    fontSize: 16,
    lineHeight: 1.7,
    color: '#cbd5e1',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: '32px 0 16px',
    color: '#e2e8f0',
  },
}
