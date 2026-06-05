'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_LOCALE,
  getMessages,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
  formatMessage,
} from '@/lib/i18n'
import { appPath } from '@/lib/paths'

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, values?: Record<string, string | number | null | undefined>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({
  initialLocale,
  categoryMessages: initialCategoryMessages = {},
  tagMessages: initialTagMessages = {},
  children,
}: {
  initialLocale?: string | null
  categoryMessages?: Record<string, string>
  tagMessages?: Record<string, string>
  children: React.ReactNode
}) {
  const [locale, setLocaleState] = useState<Locale>(
    isLocale(initialLocale) ? initialLocale : DEFAULT_LOCALE
  )
  const [categoryMessages, setCategoryMessages] =
    useState<Record<string, string>>(initialCategoryMessages)
  const [tagMessages, setTagMessages] =
    useState<Record<string, string>>(initialTagMessages)

  const staticMessages = useMemo(() => getMessages(locale), [locale])

  useEffect(() => {
    setCategoryMessages(initialCategoryMessages)
  }, [initialCategoryMessages])

  useEffect(() => {
    setTagMessages(initialTagMessages)
  }, [initialTagMessages])

  useEffect(() => {
    let cancelled = false
    fetch(appPath(`/api/i18n/category-messages?locale=${encodeURIComponent(locale)}`), {
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: unknown) => {
        if (cancelled || !data || typeof data !== 'object' || Array.isArray(data)) return
        setCategoryMessages(data as Record<string, string>)
      })
      .catch(() => {
        if (!cancelled) setCategoryMessages({})
      })
    return () => {
      cancelled = true
    }
  }, [locale])

  useEffect(() => {
    let cancelled = false
    fetch(appPath(`/api/i18n/tag-messages?locale=${encodeURIComponent(locale)}`), {
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: unknown) => {
        if (cancelled || !data || typeof data !== 'object' || Array.isArray(data)) return
        setTagMessages(data as Record<string, string>)
      })
      .catch(() => {
        if (!cancelled) setTagMessages({})
      })
    return () => {
      cancelled = true
    }
  }, [locale])

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
        const msg =
          staticMessages[key] ?? categoryMessages[key] ?? tagMessages[key] ?? key
        return formatMessage(msg, values)
      },
    }
  }, [locale, staticMessages, categoryMessages, tagMessages])

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
