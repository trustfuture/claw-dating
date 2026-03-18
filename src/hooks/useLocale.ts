'use client'

import { useState, useEffect, useCallback } from 'react'
import { type Locale, getDefaultLocale, t as translate } from '@/lib/i18n'

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>('zh')

  useEffect(() => {
    setLocaleState(getDefaultLocale())
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('locale', l)
  }, [])

  const toggle = useCallback(() => {
    setLocale(locale === 'zh' ? 'en' : 'zh')
  }, [locale, setLocale])

  const t = useCallback((key: string) => translate(key, locale), [locale])

  return { locale, setLocale, toggle, t }
}
