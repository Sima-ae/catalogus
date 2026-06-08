import { appPath, isAppPath } from '@/lib/paths'
import { parseLocaleFromPathname, localizedPath } from '@/lib/i18n-routing'
import { DEFAULT_LOCALE } from '@/lib/i18n-locale-registry'

export const SHOP_CATALOG_PATHS = ['/', '/new'] as const

export function isShopCatalogPath(pathname: string | null): boolean {
  if (!pathname) return false
  const { pathnameWithoutLocale } = parseLocaleFromPathname(pathname)
  return SHOP_CATALOG_PATHS.some(
    (p) => pathnameWithoutLocale === p || isAppPath(pathnameWithoutLocale, p)
  )
}

/** Catalog list URL preserving the locale segment (e.g. /nl/ or /en/new). */
export function shopCatalogBasePath(pathname: string | null): string {
  if (pathname && isShopCatalogPath(pathname)) {
    return pathname.split('?')[0]
  }
  const { locale } = parseLocaleFromPathname(pathname ?? '/')
  return localizedPath('/', locale ?? DEFAULT_LOCALE)
}

export function parseCatalogPageParam(searchParams: URLSearchParams): number {
  const raw = parseInt(searchParams.get('page') ?? '1', 10)
  if (!Number.isFinite(raw) || raw < 1) return 1
  return raw
}

export function setCatalogPageParam(params: URLSearchParams, page: number): void {
  if (page <= 1) params.delete('page')
  else params.set('page', String(page))
}

export function clearCatalogPageParam(params: URLSearchParams): void {
  params.delete('page')
}

/** Drop catalog text search when the user picks a category, subcategory, or brand. */
export function clearShopSearchParam(params: URLSearchParams): void {
  params.delete('search')
}

/** Stable key for scroll-restore (path + query, no hash). */
export function catalogListingKey(pathname: string, searchParams: URLSearchParams): string {
  const qs = searchParams.toString()
  return qs ? `${pathname}?${qs}` : pathname
}
