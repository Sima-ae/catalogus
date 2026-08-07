import {
  CATALOG_PAGE_SIZE,
  catalogPageBaseOffset,
  parseCatalogProductsQuery,
  type CatalogProductsPage,
} from '@/lib/catalog-products'
import { listActiveProductsPaginated } from '@/lib/products-db'
import { buildShopCatalogSignature } from '@/lib/shop-catalog-signature'

export { buildShopCatalogSignature } from '@/lib/shop-catalog-signature'

function pickSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const raw = searchParams[key]
  const value = Array.isArray(raw) ? raw[0] : raw
  const trimmed = value?.trim()
  return trimmed || undefined
}

/** Any filter query param that should skip blocking SSR product loads. */
export function searchParamsHaveShopCatalogFilters(
  searchParams: Record<string, string | string[] | undefined>
): boolean {
  for (const key of ['category', 'subcategory', 'nested', 'brand', 'tag', 'search'] as const) {
    const value = pickSearchParam(searchParams, key)
    if (!value) continue
    if (key !== 'search' && value.toLowerCase() === 'all') continue
    return true
  }
  const page = pickSearchParam(searchParams, 'page')
  return Boolean(page && page !== '1')
}

/**
 * Only SSR the first unfiltered catalog page. Filter navigations are client-only
 * so category/brand clicks are not blocked by a server DB query (often 5–60s).
 */
export function shouldServerRenderShopCatalog(
  searchParams: Record<string, string | string[] | undefined>
): boolean {
  return !searchParamsHaveShopCatalogFilters(searchParams)
}

/** Server-render first catalog page from URL filters (avoids client double-fetch). */
export async function loadInitialShopCatalog(
  searchParams: Record<string, string | string[] | undefined>,
  mode: 'all' | 'new' = 'all',
  options?: { shuffle?: boolean }
): Promise<CatalogProductsPage | null> {
  const page = Math.max(
    1,
    parseInt(
      (Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page)?.trim() ??
        '1',
      10
    ) || 1
  )
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(CATALOG_PAGE_SIZE))
  params.set('offset', String(catalogPageBaseOffset(page)))

  const pick = (key: string): string | undefined => {
    const raw = searchParams[key]
    const value = Array.isArray(raw) ? raw[0] : raw
    const trimmed = value?.trim()
    return trimmed || undefined
  }

  const category = pick('category')
  const subcategory = pick('subcategory')
  const nested = pick('nested')
  const brand = pick('brand')
  const tag = pick('tag')
  const search = pick('search')

  if (category) params.set('category', category)
  if (subcategory) params.set('subcategory', subcategory)
  if (nested) params.set('nested', nested)
  if (brand) params.set('brand', brand)
  if (tag) params.set('tag', tag)
  if (search) params.set('search', search)
  if (mode === 'new') params.set('mode', 'new')
  if (
    options?.shuffle &&
    mode === 'all' &&
    !category &&
    !subcategory &&
    !nested &&
    !brand &&
    !tag &&
    !search
  ) {
    params.set('shuffle', '1')
  }

  const query = parseCatalogProductsQuery(params)
  if (!query) return null
  return listActiveProductsPaginated(query)
}
