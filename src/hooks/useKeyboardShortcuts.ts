'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useKeyboardShortcuts() {
  const router = useRouter()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }

      // Alt+1: Lobby, Alt+2: Dates, Alt+3: Scoreboard
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault()
            router.push('/lobby')
            break
          case '2':
            e.preventDefault()
            router.push('/dates')
            break
          case '3':
            e.preventDefault()
            router.push('/scoreboard')
            break
        }
      }

      // Escape: close any open dialog/modal (handled by individual components)
      // '?' key: show shortcuts help (future)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])
}
