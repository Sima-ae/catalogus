import { parseLocaleFromPathname } from '@/lib/i18n-routing'

/** `/product/:id` (locale prefix stripped) — eligible for site-access share bypass. */
export function isPublicProductPath(pathname: string): boolean {
  const { pathnameWithoutLocale } = parseLocaleFromPathname(pathname)
  const normalized = pathnameWithoutLocale.replace(/\/$/, '') || '/'
  return /^\/product\/[^/]+$/.test(normalized)
}

/** Single-product API: `/api/products/:id` (not list/bulk routes). */
export function isPublicProductApiPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, '') || '/'
  return /^\/api\/products\/[^/]+$/.test(normalized)
}

/**
 * Asset / settings APIs needed to render a locked public-share PDP the same
 * as the unlocked shop (images + catalog-mode chrome).
 */
export function isPublicShareAssetApiPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, '') || '/'
  return (
    normalized === '/api/yupoo-image' ||
    normalized === '/api/catalog-mode'
  )
}
