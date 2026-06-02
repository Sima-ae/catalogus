import { basePath } from '@/lib/paths'
import {
  DEFAULT_LOCALE,
  getLocaleSlug,
  isLocale,
  isLocaleSlug,
  localeFromSlug,
  type Locale,
} from '@/lib/i18n-locale-registry'

export const LOCALE_COOKIE = 'catalogus_locale'

/** First path segment if it is a locale slug (e.g. /en/product → en). */
export function parseLocaleFromPathname(pathname: string): {
  locale: Locale | null
  pathnameWithoutLocale: string
} {
  const normalized = normalizePathname(pathname)
  const segments = normalized.split('/').filter(Boolean)
  if (segments.length === 0) {
    return { locale: null, pathnameWithoutLocale: '/' }
  }
  const first = segments[0]
  if (!isLocaleSlug(first)) {
    return { locale: null, pathnameWithoutLocale: normalized }
  }
  const locale = localeFromSlug(first)!
  const rest = segments.slice(1)
  const pathnameWithoutLocale = rest.length ? `/${rest.join('/')}` : '/'
  return { locale, pathnameWithoutLocale }
}

function normalizePathname(pathname: string): string {
  let p = pathname || '/'
  if (!p.startsWith('/')) p = `/${p}`
  if (basePath && p.startsWith(basePath)) {
    p = p.slice(basePath.length) || '/'
  }
  return p
}

/** Build path with locale prefix: /en/pricelist */
export function localizedPath(path: string, locale: string): string {
  const slug = getLocaleSlug(locale)
  const normalized = path.startsWith('/') ? path : `/${path}`
  const inner = normalized === '/' ? '' : normalized
  const withLocale = `/${slug}${inner}`
  return basePath ? `${basePath}${withLocale}` : withLocale
}

export function localizedPathFromWindow(path: string, locale: string): string {
  if (typeof window === 'undefined') return localizedPath(path, locale)
  const { locale: fromUrl, pathnameWithoutLocale } = parseLocaleFromPathname(
    window.location.pathname
  )
  const targetPath =
    path === '/' || path === ''
      ? pathnameWithoutLocale
      : path.startsWith('/')
        ? path
        : `/${path}`
  return localizedPath(targetPath, locale)
}

export function resolveLocaleFromCookie(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE
}
