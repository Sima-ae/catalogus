'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import {
  DEFAULT_LOCALE,
  getMessages,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
  formatMessage,
} from '@/lib/i18n'

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, values?: Record<string, string | number | null | undefined>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale?: string | null
  children: React.ReactNode
}) {
  const [locale, setLocaleState] = useState<Locale>(
    isLocale(initialLocale) ? initialLocale : DEFAULT_LOCALE
  )

  const messages = useMemo(() => getMessages(locale), [locale])

  const value = useMemo<I18nContextValue>(() => {
    return {
      locale,
      setLocale: (next) => {
        setLocaleState(next)
        document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`
        if (typeof document !== 'undefined') {
          document.documentElement.lang = next
        }
      },
      t: (key, values) => {
        const msg = messages[key] ?? key
        return formatMessage(msg, values)
      },
    }
  }, [locale, messages])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (k) => k,
    }
  }
  return ctx
}

