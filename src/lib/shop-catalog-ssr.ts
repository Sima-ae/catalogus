import { CATALOG_PAGE_SIZE } from '@/components/shop/CatalogPagination'
import {
  parseCatalogProductsQuery,
  type CatalogProductsPage,
} from '@/lib/catalog-products'
import { listActiveProductsPaginated } from '@/lib/products-db'
import { buildShopCatalogSignature } from '@/lib/shop-catalog-signature'

export { buildShopCatalogSignature } from '@/lib/shop-catalog-signature'

/** Server-render first catalog page from URL filters (avoids client double-fetch). */
export async function loadInitialShopCatalog(
  searchParams: Record<string, string | string[] | undefined>,
  mode: 'all' | 'new' = 'all'
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

  const pick = (key: string): string | undefined => {
    const raw = searchParams[key]
    const value = Array.isArray(raw) ? raw[0] : raw
    const trimmed = value?.trim()
    return trimmed || undefined
  }

  const category = pick('category')
  const subcategory = pick('subcategory')
  const brand = pick('brand')
  const tag = pick('tag')
  const search = pick('search')

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
