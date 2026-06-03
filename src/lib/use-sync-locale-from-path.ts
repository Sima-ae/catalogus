'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { parseLocaleFromPathname } from '@/lib/i18n-routing'
import { useI18n } from '@/lib/i18n-context'
import { isLocale } from '@/lib/i18n'

/**
 * Align i18n locale with URL slug or `?from=/zh/...` (site-access gate has no locale prefix).
 */
export function useSyncLocaleFromPath(returnPath?: string | null) {
  const pathname = usePathname()
  const { locale, setLocale } = useI18n()

  useEffect(() => {
    const fromUrl = parseLocaleFromPathname(pathname ?? '/').locale
    const fromReturn = returnPath
      ? parseLocaleFromPathname(returnPath.split('?')[0] ?? '/').locale
      : null
    const detected = fromReturn ?? fromUrl
    if (detected && detected !== locale && isLocale(detected)) {
      setLocale(detected)
    }
  }, [pathname, returnPath, locale, setLocale])
}
