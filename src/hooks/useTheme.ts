'use client'

import { useState, useEffect, useCallback } from 'react'

type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system')
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored === 'light' || stored === 'dark') {
      setThemeState(stored)
    }
    setIsDark(document.documentElement.classList.contains('dark') ||
      (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches))
  }, [])

  const applyTheme = useCallback((t: Theme) => {
    const root = document.documentElement
    if (t === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
      setIsDark(true)
    } else if (t === 'light') {
      root.classList.add('light')
      root.classList.remove('dark')
      setIsDark(false)
    } else {
      root.classList.remove('dark', 'light')
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    applyTheme(t)
    if (t === 'system') {
      localStorage.removeItem('theme')
    } else {
      localStorage.setItem('theme', t)
    }
  }, [applyTheme])

  const toggle = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark')
  }, [isDark, setTheme])

  return { theme, setTheme, toggle, isDark }
}
