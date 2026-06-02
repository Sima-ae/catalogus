import { appPath, isAppPath } from '@/lib/paths'

export const SHOP_CATALOG_PATHS = ['/', '/new'] as const

export function isShopCatalogPath(pathname: string | null): boolean {
  if (!pathname) return false
  return SHOP_CATALOG_PATHS.some((p) => isAppPath(pathname, p) || pathname === p)
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

/** Stable key for scroll-restore (path + query, no hash). */
export function catalogListingKey(pathname: string, searchParams: URLSearchParams): string {
  const qs = searchParams.toString()
  return qs ? `${pathname}?${qs}` : pathname
}
