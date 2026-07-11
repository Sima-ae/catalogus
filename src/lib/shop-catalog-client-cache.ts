import {
  buildCatalogProductsUrl,
  CATALOG_PAGE_SIZE,
  catalogPageBaseOffset,
  isCatalogProductsPage,
  type CatalogProductsPage,
} from '@/lib/catalog-products'
import { buildShopCatalogSignature } from '@/lib/shop-catalog-signature'
import { appPath } from '@/lib/paths'

type CatalogCacheEntry = {
  page: CatalogProductsPage
  fetchedAt: number
  shuffle: boolean
}

const catalogCache = new Map<string, CatalogCacheEntry>()
const catalogInflight = new Map<string, Promise<CatalogProductsPage | null>>()

/** How long a cached catalog page is served without a network round-trip. */
export const SHOP_CATALOG_CACHE_TTL_MS = 2 * 60 * 1000
/** Shorter TTL for randomized homepage order — still avoids repeat fetches on back-nav. */
export const SHOP_CATALOG_SHUFFLE_CACHE_TTL_MS = 90 * 1000

export type ShopCatalogFilterPrefetch = {
  page?: number
  category?: string
  subcategory?: string
  nested?: string
  brand?: string
  tag?: string
  search?: string
  mode?: 'all' | 'new'
  shuffle?: boolean
}

function cacheTtlMs(entry: CatalogCacheEntry): number {
  return entry.shuffle ? SHOP_CATALOG_SHUFFLE_CACHE_TTL_MS : SHOP_CATALOG_CACHE_TTL_MS
}

/** Stable key for a catalog page request (matches SSR signature). */
export function shopCatalogClientSignature(
  filters: ShopCatalogFilterPrefetch
): string {
  return buildShopCatalogSignature(
    {
      page: String(filters.page ?? 1),
      category: filters.category && filters.category !== 'All' ? filters.category : 'All',
      subcategory:
        filters.subcategory && filters.subcategory !== 'All' ? filters.subcategory : 'All',
      nested: filters.nested && filters.nested !== 'All' ? filters.nested : 'All',
      brand: filters.brand && filters.brand !== 'All' ? filters.brand : 'All',
      tag: filters.tag ?? '',
      search: filters.search ?? '',
    },
    filters.mode ?? 'all',
    { shuffle: filters.shuffle }
  )
}

export function getCachedShopCatalog(signature: string): CatalogProductsPage | undefined {
  return catalogCache.get(signature)?.page
}

export function isShopCatalogCacheFresh(signature: string): boolean {
  const entry = catalogCache.get(signature)
  if (!entry) return false
  return Date.now() - entry.fetchedAt < cacheTtlMs(entry)
}

export function setCachedShopCatalog(
  signature: string,
  page: CatalogProductsPage,
  options?: { shuffle?: boolean }
): void {
  if (page.total <= 0 && page.items.length === 0) return
  catalogCache.set(signature, {
    page,
    fetchedAt: Date.now(),
    shuffle: options?.shuffle === true,
  })
}

export function invalidateShopCatalogCache(): void {
  catalogCache.clear()
  catalogInflight.clear()
}

async function fetchShopCatalogPage(
  filters: ShopCatalogFilterPrefetch
): Promise<CatalogProductsPage | null> {
  const page = filters.page ?? 1
  const url = buildCatalogProductsUrl(appPath('/api/products'), {
    page,
    limit: CATALOG_PAGE_SIZE,
    offset: catalogPageBaseOffset(page),
    category: filters.category && filters.category !== 'All' ? filters.category : undefined,
    subcategory:
      filters.subcategory && filters.subcategory !== 'All' ? filters.subcategory : undefined,
    nested: filters.nested && filters.nested !== 'All' ? filters.nested : undefined,
    brand: filters.brand && filters.brand !== 'All' ? filters.brand : undefined,
    tag: filters.tag || undefined,
    search: filters.search || undefined,
    mode: filters.mode === 'new' ? 'new' : undefined,
    shuffle: filters.shuffle ? true : undefined,
    skipTotal: page > 1 ? true : undefined,
  })

  const response = await fetch(url, { method: 'GET' })
  if (!response.ok) return null
  const data: unknown = await response.json()
  if (!isCatalogProductsPage(data)) return null
  return data
}

/** Warm catalog cache on category/brand hover or click (parallel with navigation). */
export function prefetchShopCatalogFilter(filters: ShopCatalogFilterPrefetch): void {
  const signature = shopCatalogClientSignature(filters)
  if (isShopCatalogCacheFresh(signature)) return

  const pending = catalogInflight.get(signature)
  if (pending) return

  const request = fetchShopCatalogPage(filters)
    .then((page) => {
      if (page) {
        setCachedShopCatalog(signature, page, { shuffle: filters.shuffle })
      }
      return page
    })
    .finally(() => {
      catalogInflight.delete(signature)
    })

  catalogInflight.set(signature, request)
}

/** Read prefetched page if hover/click warmed the cache before navigation finished. */
export function consumePrefetchedShopCatalog(
  filters: ShopCatalogFilterPrefetch
): CatalogProductsPage | null {
  const signature = shopCatalogClientSignature(filters)
  const cached = catalogCache.get(signature)
  if (cached) return cached.page
  return null
}
