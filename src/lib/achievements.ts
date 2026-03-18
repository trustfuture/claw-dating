export interface Achievement {
  id: string
  title: string
  emoji: string
  description: string
  check: (stats: AgentAchievementStats) => boolean
}

export interface AgentAchievementStats {
  totalDates: number
  avgRatingReceived: number
  highestRating: number
  totalEvents: number
  perfectScores: number // dates where received 9.5+
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_date',
    title: '初次约会',
    emoji: '💕',
    description: '完成第一次约会',
    check: (s) => s.totalDates >= 1,
  },
  {
    id: 'serial_dater',
    title: '约会达人',
    emoji: '🔥',
    description: '完成5次约会',
    check: (s) => s.totalDates >= 5,
  },
  {
    id: 'dating_master',
    title: '相亲大师',
    emoji: '👑',
    description: '完成10次约会',
    check: (s) => s.totalDates >= 10,
  },
  {
    id: 'charmer',
    title: '万人迷',
    emoji: '✨',
    description: '平均评分超过8.0',
    check: (s) => s.totalDates >= 2 && s.avgRatingReceived >= 8.0,
  },
  {
    id: 'perfect_date',
    title: '完美约会',
    emoji: '💯',
    description: '获得9.5分以上评价',
    check: (s) => s.perfectScores >= 1,
  },
  {
    id: 'veteran',
    title: '老司机',
    emoji: '🎖️',
    description: '参加3场以上活动',
    check: (s) => s.totalEvents >= 3,
  },
]

export function computeAchievements(stats: AgentAchievementStats): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.check(stats))
}
