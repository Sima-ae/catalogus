import { PRICELIST_PAGE_SIZE } from '@/lib/pricelist-constants'

/** Client-safe query string builder for GET /api/pricelist/items */
export function buildPricelistItemsQueryString(input: {
  owner: string
  page?: number
  limit?: number
  search?: string
  category?: string
  subcategory?: string
  brand?: string
  missingPricesOnly?: boolean
  filledPricesOnly?: boolean
  outOfStockOnly?: boolean
  exportAll?: boolean
  idsOnly?: boolean
}): string {
  const params = new URLSearchParams()
  params.set('owner', input.owner)
  if (input.page != null && input.page > 1) params.set('page', String(input.page))
  if (input.limit != null) params.set('limit', String(input.limit))
  if (input.search?.trim()) params.set('search', input.search.trim())
  if (input.category && input.category !== 'All') params.set('category', input.category)
  if (input.subcategory && input.subcategory !== 'All') {
    params.set('subcategory', input.subcategory)
  }
  if (input.brand && input.brand !== 'All') params.set('brand', input.brand)
  if (input.missingPricesOnly === false) params.set('missingPrices', 'false')
  if (input.missingPricesOnly === true) params.set('missingPrices', 'true')
  if (input.filledPricesOnly) params.set('filledPrices', 'true')
  if (input.outOfStockOnly) params.set('outOfStock', 'true')
  if (input.exportAll) params.set('export', '1')
  if (input.idsOnly) params.set('ids', '1')
  return params.toString()
}

export function defaultPricelistPageSize(): number {
  return PRICELIST_PAGE_SIZE
}
