'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

interface User {
  id: string
  name: string
  email: string
  avatarUrl: string
  route: string
}

interface Agent {
  id: string
  name: string
  avatarEmoji: string
  personalityType: string
  interests: string[]
  catchphrase: string
  status: string
}

interface AuthState {
  user: User | null
  agent: Agent | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function loadAuthState() {
  const response = await fetch('/api/auth/me')
  if (!response.ok) {
    throw new Error('Not logged in')
  }

  const data = await response.json()

  return {
    user: data.user ?? null,
    agent: data.agent ?? null,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    agent: null,
    loading: true,
  })

  const refresh = useCallback(async () => {
    try {
      const nextState = await loadAuthState()
      setState({
        ...nextState,
        loading: false,
      })
    } catch {
      setState({
        user: null,
        agent: null,
        loading: false,
      })
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setState({
      user: null,
      agent: null,
      loading: false,
    })
    window.location.href = '/'
  }, [])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
