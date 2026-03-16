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
}

export type EventPhase = 'registration' | 'matching' | 'dating' | 'results'

export interface EventState {
  phase: EventPhase
  agents: RegisteredAgent[]
  pairings: Pairing[]
  dates: DateSession[]
}

export interface WSEvent {
  type: string
  data: any
}
