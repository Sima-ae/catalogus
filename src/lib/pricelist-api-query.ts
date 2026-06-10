import { loadActiveCategories } from '@/lib/categories-persistence'
import { PRICELIST_MAX_SELECTION_IDS } from '@/lib/pricelist-constants'
import { defaultPricelistPageSize } from '@/lib/pricelist-items-query-string'
import type { PricelistListFilterInput, PricelistListViewer } from '@/lib/pricelist-list-query'
import { resolveShopCategoryFilter } from '@/lib/shop-category-tree'

export type ParsedPricelistItemsQuery = {
  page: number
  limit: number
  exportAll: boolean
  idsOnly: boolean
  filters: PricelistListFilterInput
}

export type PricelistClientFilterInput = {
  search?: string
  category?: string
  subcategory?: string
  brand?: string
  missingPricesOnly?: boolean
  filledPricesOnly?: boolean
  outOfStockOnly?: boolean
}

/** Resolve list filters from URL params or bulk-update JSON (same rules as the pricelist UI). */
export async function buildPricelistFiltersFromClient(
  input: PricelistClientFilterInput
): Promise<PricelistListFilterInput> {
  const search = input.search?.trim() || undefined
  const brandRaw = input.brand?.trim()
  const brand = brandRaw && brandRaw !== 'All' ? brandRaw : undefined

  const category = input.category?.trim()
  const subcategory = input.subcategory?.trim()

  let categoryFilter: PricelistListFilterInput['categoryFilter']
  if (category && category !== 'All') {
    const categories = await loadActiveCategories()
    categoryFilter =
      resolveShopCategoryFilter(categories, {
        category,
        subcategory: subcategory && subcategory !== 'All' ? subcategory : undefined,
      }) ?? { categoryIds: [], legacyNames: [], strictIdOnly: true }
  }

  return {
    search,
    brand,
    categoryFilter,
    missingPricesOnly:
      input.filledPricesOnly === true || input.outOfStockOnly === true
        ? false
        : input.missingPricesOnly !== false,
    filledPricesOnly: input.filledPricesOnly === true,
    outOfStockOnly: input.outOfStockOnly === true,
  }
}

/** Admin-only quick filters (with price / out of stock). */
export function restrictAdminOnlyPricelistFilters(
  filters: PricelistListFilterInput,
  viewer: Pick<PricelistListViewer, 'role' | 'isSuperAdmin'>
): PricelistListFilterInput {
  const canUseAdminFilters = viewer.role === 'admin' || Boolean(viewer.isSuperAdmin)
  if (canUseAdminFilters) return filters

  const hadAdminFilter = filters.filledPricesOnly || filters.outOfStockOnly
  return {
    ...filters,
    filledPricesOnly: false,
    outOfStockOnly: false,
    missingPricesOnly: hadAdminFilter ? true : filters.missingPricesOnly,
  }
}

export async function parsePricelistItemsQuery(
  searchParams: URLSearchParams
): Promise<ParsedPricelistItemsQuery> {
  const pageRaw = parseInt(searchParams.get('page') ?? '1', 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const limitRaw = parseInt(searchParams.get('limit') ?? String(defaultPricelistPageSize()), 10)
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(100, limitRaw)
      : defaultPricelistPageSize()

  const exportAll = searchParams.get('export') === '1'
  const idsOnly = searchParams.get('ids') === '1'

  const category = searchParams.get('category')?.trim()
  const subcategory = searchParams.get('subcategory')?.trim()
  const filledPricesOnly = searchParams.get('filledPrices') === 'true'
  const outOfStockOnly = searchParams.get('outOfStock') === 'true'
  const missingParam = searchParams.get('missingPrices')
  const missingPricesOnly =
    filledPricesOnly || outOfStockOnly
      ? false
      : missingParam === null
        ? true
        : missingParam !== 'false'

  const filters = await buildPricelistFiltersFromClient({
    search: searchParams.get('search') ?? undefined,
    category,
    subcategory,
    brand: searchParams.get('brand') ?? undefined,
    missingPricesOnly: exportAll ? false : missingPricesOnly,
    filledPricesOnly: exportAll ? false : filledPricesOnly,
    outOfStockOnly: exportAll ? false : outOfStockOnly,
  })

  return {
    page,
    limit: exportAll ? 5000 : idsOnly ? PRICELIST_MAX_SELECTION_IDS : limit,
    exportAll,
    idsOnly,
    filters,
  }
}

