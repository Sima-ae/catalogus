import {
  CATALOG_BATCH_SIZE,
  catalogPageBaseOffset,
  parseCatalogProductsQuery,
  type CatalogProductsPage,
} from '@/lib/catalog-products'
import { listActiveProductsPaginated } from '@/lib/products-db'
import { buildShopCatalogSignature } from '@/lib/shop-catalog-signature'

export { buildShopCatalogSignature } from '@/lib/shop-catalog-signature'

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
  params.set('limit', String(CATALOG_BATCH_SIZE))
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
