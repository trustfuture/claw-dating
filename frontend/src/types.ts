export interface RegisteredAgent {
  id: string
  agent_url: string
  agent_card: Record<string, any>
  name: string
  description: string
  avatar_emoji: string
  personality_type: string
  interests: string[]
  catchphrase: string
  love_language: string
  name_cn: string
  is_demo: boolean
  status: string  // online, offline, in_date
  registered_at: string
}

export interface Pairing {
  id: string
  agent_a: RegisteredAgent
  agent_b: RegisteredAgent
  compatibility_score: number
  reasoning: string
  round: number
}

export interface MutualMatch {
  date_id: string
  agent_a: RegisteredAgent
  agent_b: RegisteredAgent
  score_a: number
  score_b: number
  combined_score: number
}

export interface DateMessage {
  sender_id: string
  sender_name: string
  content: string
  turn: number
  timestamp: string
}

export interface DateRating {
  agent_id: string
  agent_name: string
  score: number
  comment: string
}

export interface DateSession {
  id: string
  pairing: Pairing
  messages: DateMessage[]
  status: 'pending' | 'in_progress' | 'rating' | 'completed' | 'failed'
  ratings: DateRating[]
  round: number
}

export type EventPhase = 'registration' | 'matching' | 'dating' | 'results'

export interface EventState {
  event_id: string
  phase: EventPhase
  agents: RegisteredAgent[]
  pairings: Pairing[]
  dates: DateSession[]
  mutual_matches: MutualMatch[]
  current_round: number
  total_rounds: number
}

export interface Award {
  title: string
  emoji: string
  winners: string[]
  winner_emojis?: string[]
  score: number
}

export interface WSEvent {
  type: string
  data: any
}
