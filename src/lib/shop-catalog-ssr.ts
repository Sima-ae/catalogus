import { CATALOG_PAGE_SIZE } from '@/components/shop/CatalogPagination'
import {
  parseCatalogProductsQuery,
  type CatalogProductsPage,
} from '@/lib/catalog-products'
import { listActiveProductsPaginated } from '@/lib/products-db'

function pickSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const raw = searchParams[key]
  const value = Array.isArray(raw) ? raw[0] : raw
  const trimmed = value?.trim()
  return trimmed || undefined
}

/** Stable key for matching SSR catalog payload to client URL filters. */
export function buildShopCatalogSignature(
  searchParams: Record<string, string | string[] | undefined>,
  mode: 'all' | 'new' = 'all'
): string {
  const page = pickSearchParam(searchParams, 'page') ?? '1'
  const category = pickSearchParam(searchParams, 'category') ?? 'All'
  const subcategory = pickSearchParam(searchParams, 'subcategory') ?? 'All'
  const brand = pickSearchParam(searchParams, 'brand') ?? 'All'
  const tag = pickSearchParam(searchParams, 'tag') ?? ''
  const search = pickSearchParam(searchParams, 'search') ?? ''
  return `${page}|${category}|${subcategory}|${brand}|${tag}|${search}|${mode}`
}

/** Server-render first catalog page from URL filters (avoids client double-fetch). */
export async function loadInitialShopCatalog(
  searchParams: Record<string, string | string[] | undefined>,
  mode: 'all' | 'new' = 'all'
): Promise<CatalogProductsPage | null> {
  const page = Math.max(1, parseInt(pickSearchParam(searchParams, 'page') ?? '1', 10) || 1)
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(CATALOG_PAGE_SIZE))

  const category = pickSearchParam(searchParams, 'category')
  const subcategory = pickSearchParam(searchParams, 'subcategory')
  const brand = pickSearchParam(searchParams, 'brand')
  const tag = pickSearchParam(searchParams, 'tag')
  const search = pickSearchParam(searchParams, 'search')

  if (category) params.set('category', category)
  if (subcategory) params.set('subcategory', subcategory)
  if (brand) params.set('brand', brand)
  if (tag) params.set('tag', tag)
  if (search) params.set('search', search)
  if (mode === 'new') params.set('mode', 'new')

  const query = parseCatalogProductsQuery(params)
  if (!query) return null
  return listActiveProductsPaginated(query)
}
