'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export function useKeyboardShortcuts() {
  const router = useRouter()
  const [showHelp, setShowHelp] = useState(false)

  const toggleHelp = useCallback(() => setShowHelp((v) => !v), [])
  const closeHelp = useCallback(() => setShowHelp(false), [])

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

      // '?' key: show shortcuts help
      if (e.key === '?' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setShowHelp((v) => !v)
        return
      }

      // Escape: close help
      if (e.key === 'Escape' && showHelp) {
        setShowHelp(false)
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
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router, showHelp])

  return { showHelp, toggleHelp, closeHelp }
}

export const KEYBOARD_SHORTCUTS = [
  { keys: ['Alt', '1'], description: '前往大厅' },
  { keys: ['Alt', '2'], description: '前往约会' },
  { keys: ['Alt', '3'], description: '前往排行榜' },
  { keys: ['?'], description: '显示/隐藏快捷键' },
  { keys: ['Esc'], description: '关闭弹窗' },
]
