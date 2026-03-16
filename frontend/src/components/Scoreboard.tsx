import type { DateMessage, DateRating, Pairing, Award, MutualMatch } from '../types'

interface DateResult {
  id: string
  messages: DateMessage[]
  ratings: DateRating[]
}

interface Props {
  dates: DateResult[]
  pairings: Pairing[]
  awards: Award[]
  mutualMatches: MutualMatch[]
}

export function Scoreboard({ dates, pairings, awards, mutualMatches }: Props) {
  const ranked = dates
    .map(d => {
      const avg = d.ratings.length
        ? d.ratings.reduce((s, r) => s + r.score, 0) / d.ratings.length
        : 0
      const pairing = pairings.find(p =>
        d.messages.some(m => m.sender_id === p.agent_a.id || m.sender_id === p.agent_b.id)
      )
      return { ...d, avg, pairing }
    })
    .sort((a, b) => b.avg - a.avg)

  if (ranked.length === 0 && awards.length === 0) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>Final Results</h2>
        <div style={{ textAlign: 'center', padding: 40, color: '#475569' }}>
          No date data available.
        </div>
      </div>
    )
  }

  // Use first award (Best Couple) as the hero if available
  const heroAward = awards[0]
  const otherAwards = awards.slice(1)

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Final Results</h2>

      {/* Hero Award */}
      {heroAward && (
        <div style={styles.heroAward}>
          <div style={styles.trophy}>{heroAward.emoji || '\uD83C\uDFC6'}</div>
          <div style={styles.heroLabel}>{heroAward.title}</div>
          <div style={styles.heroCouple}>
            {heroAward.winner_emojis?.[0] && (
              <span style={styles.heroAvatar}>{heroAward.winner_emojis[0]}</span>
            )}
            <span style={styles.heroName}>{heroAward.winners[0]}</span>
            {heroAward.winners.length > 1 && (
              <>
                <span style={styles.heroHeart}>{'\u2764\uFE0F'}</span>
                <span style={styles.heroName}>{heroAward.winners[1]}</span>
                {heroAward.winner_emojis?.[1] && (
                  <span style={styles.heroAvatar}>{heroAward.winner_emojis[1]}</span>
                )}
              </>
            )}
          </div>
          <div style={styles.heroScore}>{heroAward.score} / 10</div>
        </div>
      )}

      {/* Other Awards Grid */}
      {otherAwards.length > 0 && (
        <div style={styles.awardsGrid}>
          {otherAwards.map((award, i) => (
            <div key={i} style={styles.awardCard}>
              <div style={styles.awardEmoji}>{award.emoji}</div>
              <div style={styles.awardTitle}>{award.title}</div>
              <div style={styles.awardWinners}>
                {award.winner_emojis?.map((e, j) => (
                  <span key={j} style={styles.awardWinnerEmoji}>{e}</span>
                ))}
                {award.winners.join(' & ')}
              </div>
              <div style={styles.awardScore}>
                {typeof award.score === 'number' && award.score % 1 === 0
                  ? award.score
                  : award.score}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mutual Matches Summary */}
      {mutualMatches.length > 0 && (
        <div style={styles.matchSummary}>
          <span style={styles.matchCount}>{mutualMatches.length}</span>
          mutual match{mutualMatches.length !== 1 ? 'es' : ''} found tonight!
        </div>
      )}

      {/* Results Table */}
      {ranked.length > 0 && (
        <div style={styles.table}>
          <div style={styles.tableHead}>
            <span style={styles.colRank}>Rank</span>
            <span style={styles.colCouple}>Couple</span>
            <span style={styles.colRound}>Round</span>
            <span style={styles.colCompat}>Compat</span>
            <span style={styles.colRating}>Rating</span>
            <span style={styles.colMsgs}>Msgs</span>
          </div>
          {ranked.map((d, i) => (
            <div key={d.id} style={{
              ...styles.tableRow,
              background: i === 0 ? 'rgba(251,191,36,0.05)' : 'transparent',
            }}>
              <span style={styles.colRank}>
                {i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : `#${i + 1}`}
              </span>
              <span style={styles.colCouple}>
                {d.pairing
                  ? `${d.pairing.agent_a.avatar_emoji} ${d.pairing.agent_a.name} x ${d.pairing.agent_b.name} ${d.pairing.agent_b.avatar_emoji}`
                  : 'Unknown'}
              </span>
              <span style={{ ...styles.colRound, color: '#64748b' }}>
                R{d.pairing?.round || 1}
              </span>
              <span style={styles.colCompat}>
                {d.pairing?.compatibility_score || '\u2014'}
              </span>
              <span style={{
                ...styles.colRating,
                color: d.avg >= 8 ? '#4ade80' : d.avg >= 6 ? '#fbbf24' : '#f87171',
                fontWeight: 700,
              }}>
                {d.avg.toFixed(1)}
              </span>
              <span style={{ ...styles.colMsgs, color: '#64748b' }}>
                {d.messages.length}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { marginTop: 24 },
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: '#fbbf24',
    marginBottom: 20,
    textAlign: 'center',
  },
  heroAward: {
    background: 'linear-gradient(135deg, rgba(251,191,36,0.06), rgba(245,158,11,0.04))',
    border: '1px solid rgba(251,191,36,0.15)',
    borderRadius: 24,
    padding: '36px 32px',
    textAlign: 'center',
    marginBottom: 20,
  },
  trophy: { fontSize: 56, marginBottom: 8 },
  heroLabel: {
    fontSize: 16,
    fontWeight: 700,
    color: '#fbbf24',
    marginBottom: 16,
  },
  heroCouple: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    fontSize: 18,
    marginBottom: 12,
  },
  heroAvatar: { fontSize: 32 },
  heroName: { fontWeight: 700, color: '#fff' },
  heroHeart: { fontSize: 22, animation: 'pulse 1.5s infinite' },
  heroScore: { fontSize: 28, fontWeight: 800, color: '#fbbf24' },

  // Awards grid
  awardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 12,
    marginBottom: 20,
  },
  awardCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: '18px 14px',
    textAlign: 'center',
  },
  awardEmoji: { fontSize: 32, marginBottom: 6 },
  awardTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#94a3b8',
    marginBottom: 8,
    lineHeight: 1.3,
  },
  awardWinners: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: 4,
  },
  awardWinnerEmoji: { marginRight: 4 },
  awardScore: {
    fontSize: 18,
    fontWeight: 800,
    color: '#fbbf24',
    marginTop: 4,
  },

  // Mutual match summary
  matchSummary: {
    textAlign: 'center',
    padding: '14px 20px',
    background: 'rgba(244,63,94,0.06)',
    border: '1px solid rgba(244,63,94,0.1)',
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 14,
    color: '#f472b6',
  },
  matchCount: {
    fontWeight: 800,
    fontSize: 18,
    marginRight: 4,
  },

  // Table
  table: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tableHead: {
    display: 'flex',
    padding: '12px 20px',
    background: 'rgba(0,0,0,0.2)',
    fontSize: 11,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tableRow: {
    display: 'flex',
    padding: '14px 20px',
    borderTop: '1px solid rgba(255,255,255,0.03)',
    fontSize: 13,
    alignItems: 'center',
  },
  colRank: { width: 50 },
  colCouple: { flex: 1, fontWeight: 600 },
  colRound: { width: 60, textAlign: 'center' },
  colCompat: { width: 70, textAlign: 'center' },
  colRating: { width: 70, textAlign: 'center' },
  colMsgs: { width: 60, textAlign: 'center' },
}
