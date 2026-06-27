import { CATALOG_PAGE_SIZE } from '@/components/shop/CatalogPagination'
import {
  buildCatalogProductsUrl,
  isCatalogProductsPage,
  type CatalogProductsPage,
} from '@/lib/catalog-products'
import { buildShopCatalogSignature } from '@/lib/shop-catalog-signature'
import { appPath } from '@/lib/paths'

const catalogCache = new Map<string, CatalogProductsPage>()
const catalogInflight = new Map<string, Promise<CatalogProductsPage | null>>()

export type ShopCatalogFilterPrefetch = {
  page?: number
  category?: string
  subcategory?: string
  nested?: string
  brand?: string
  tag?: string
  search?: string
  mode?: 'all' | 'new'
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
    filters.mode ?? 'all'
  )
}

export function getCachedShopCatalog(signature: string): CatalogProductsPage | undefined {
  return catalogCache.get(signature)
}

export function setCachedShopCatalog(signature: string, page: CatalogProductsPage): void {
  catalogCache.set(signature, page)
}

export function invalidateShopCatalogCache(): void {
  catalogCache.clear()
  catalogInflight.clear()
}

async function fetchShopCatalogPage(
  filters: ShopCatalogFilterPrefetch
): Promise<CatalogProductsPage | null> {
  const url = buildCatalogProductsUrl(appPath('/api/products'), {
    page: filters.page ?? 1,
    limit: CATALOG_PAGE_SIZE,
    category: filters.category && filters.category !== 'All' ? filters.category : undefined,
    subcategory:
      filters.subcategory && filters.subcategory !== 'All' ? filters.subcategory : undefined,
    nested: filters.nested && filters.nested !== 'All' ? filters.nested : undefined,
    brand: filters.brand && filters.brand !== 'All' ? filters.brand : undefined,
    tag: filters.tag || undefined,
    search: filters.search || undefined,
    mode: filters.mode === 'new' ? 'new' : undefined,
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
  if (catalogCache.has(signature)) return

  const pending = catalogInflight.get(signature)
  if (pending) return

  const request = fetchShopCatalogPage(filters)
    .then((page) => {
      if (page) catalogCache.set(signature, page)
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
  if (cached) return cached
  return null
}
