'use client'

import { useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { localizedPath, parseLocaleFromPathname } from '@/lib/i18n-routing'
import { useI18n } from '@/lib/i18n-context'

/** Prefix `path` with the active locale slug from the URL (or current i18n locale). */
export function useLocalizedPath() {
  const pathname = usePathname()
  const { locale } = useI18n()

  return useCallback(
    (path: string) => {
      const normalized = path.startsWith('/') ? path : `/${path}`
      const { locale: fromUrl, pathnameWithoutLocale } = parseLocaleFromPathname(pathname ?? '/')
      const active = fromUrl ?? locale
      if (normalized === '/' || normalized === '') {
        return localizedPath(pathnameWithoutLocale, active)
      }
      return localizedPath(normalized, active)
    },
    [pathname, locale]
  )
}
