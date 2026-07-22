import { appPath, isAppPath } from '@/lib/paths'
import { parseLocaleFromPathname, localizedPath } from '@/lib/i18n-routing'
import { DEFAULT_LOCALE } from '@/lib/i18n-locale-registry'

export const SHOP_CATALOG_PATHS = ['/', '/new'] as const

/** Paths that support category / subcategory / brand query filters (shop + pricelist). */
export const CATALOG_FILTER_PATHS = ['/', '/new', '/pricelist'] as const

function matchesCatalogPath(
  pathname: string | null,
  paths: readonly string[]
): boolean {
  if (!pathname) return false
  const { pathnameWithoutLocale } = parseLocaleFromPathname(pathname)
  return paths.some(
    (p) => pathnameWithoutLocale === p || isAppPath(pathnameWithoutLocale, p)
  )
}

export function isShopCatalogPath(pathname: string | null): boolean {
  return matchesCatalogPath(pathname, SHOP_CATALOG_PATHS)
}

export function isCatalogFilterPath(pathname: string | null): boolean {
  return matchesCatalogPath(pathname, CATALOG_FILTER_PATHS)
}

/** Catalog list URL preserving the locale segment (e.g. /nl/ or /en/new). */
export function shopCatalogBasePath(pathname: string | null): string {
  if (pathname && isShopCatalogPath(pathname)) {
    return pathname.split('?')[0]
  }
  const { locale } = parseLocaleFromPathname(pathname ?? '/')
  return localizedPath('/', locale ?? DEFAULT_LOCALE)
}

/** Base path for pages with category/brand filter query params (shop or pricelist). */
export function catalogFilterBasePath(pathname: string | null): string {
  if (pathname && isCatalogFilterPath(pathname)) {
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

/** Previously cleared ?search= on category/brand picks; search is now kept across filters. */
export function clearShopSearchParam(params: URLSearchParams): void {
  params.delete('search')
}

/** Stable key for scroll-restore (path + query, no hash). */
export function catalogListingKey(pathname: string, searchParams: URLSearchParams): string {
  const qs = searchParams.toString()
  return qs ? `${pathname}?${qs}` : pathname
}
