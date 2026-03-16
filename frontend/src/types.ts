export interface LobsterProfile {
  id: string
  name: string
  name_cn: string
  personality_type: string
  catchphrase: string
  interests: string[]
  deal_breakers: string[]
  love_language: string
  avatar_emoji: string
  port: number
  url: string
}

export interface Pairing {
  id: string
  lobster_a: LobsterProfile
  lobster_b: LobsterProfile
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
  lobster_id: string
  lobster_name: string
  score: number
  comment: string
}

export interface DateSession {
  id: string
  pairing: Pairing
  messages: DateMessage[]
  status: 'pending' | 'in_progress' | 'rating' | 'completed'
  ratings: DateRating[]
}

export type EventPhase = 'registration' | 'matching' | 'dating' | 'results'

export interface EventState {
  phase: EventPhase
  lobsters: LobsterProfile[]
  pairings: Pairing[]
  dates: DateSession[]
}

export interface WSEvent {
  type: string
  data: any
}
