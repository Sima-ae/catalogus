import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n-locale-registry'
import {
  localizedPath,
  parseLocaleFromPathname,
  resolveLocaleFromCookie,
} from '@/lib/i18n-routing'

export type LocalePathResolution =
  | {
      action: 'rewrite'
      locale: Locale
      /** Internal Next.js path (locale prefix stripped). */
      pathname: string
    }
  | {
      action: 'redirect'
      locale: Locale
      /** Browser URL with locale prefix. */
      pathname: string
    }

/**
 * Shared locale routing decision used by middleware for unlocked traffic and
 * locked share pages (product / pricelist). Keeps every language slug consistent.
 */
export function resolveLocalePathRouting(
  pathname: string,
  cookieLocaleRaw?: string | null,
  fallbackLocale: Locale = DEFAULT_LOCALE
): LocalePathResolution {
  const { locale: pathLocale, pathnameWithoutLocale } = parseLocaleFromPathname(pathname)
  if (pathLocale) {
    return {
      action: 'rewrite',
      locale: pathLocale,
      pathname: pathnameWithoutLocale,
    }
  }

  const cookieLocale = resolveLocaleFromCookie(cookieLocaleRaw, fallbackLocale)
  return {
    action: 'redirect',
    locale: cookieLocale,
    pathname: localizedPath(pathname, cookieLocale),
  }
}

/** Localized in-app path for share / OG links. */
export function localizedAppPathForLocale(path: string, locale?: Locale | null): string {
  return localizedPath(path, locale ?? DEFAULT_LOCALE)
}
