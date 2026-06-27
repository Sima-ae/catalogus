import { loadActiveCategories } from '@/lib/categories-persistence'
import {
  MAX_PRICELIST_PAGE_SIZE,
  PRICELIST_MAX_SELECTION_IDS,
  PRICELIST_PAGE_SIZE,
  PRICELIST_PAGE_SIZES,
} from '@/lib/pricelist-constants'
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
  nested?: string
  brand?: string
  missingPricesOnly?: boolean
  filledPricesOnly?: boolean
  outOfStockOnly?: boolean
}

export function parsePricelistClientFilterInput(raw: unknown): PricelistClientFilterInput | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  return {
    search: row.search != null ? String(row.search) : undefined,
    category: row.category != null ? String(row.category) : undefined,
    subcategory: row.subcategory != null ? String(row.subcategory) : undefined,
    nested: row.nested != null ? String(row.nested) : undefined,
    brand: row.brand != null ? String(row.brand) : undefined,
    missingPricesOnly:
      row.missingPricesOnly === false || row.missingPricesOnly === 'false'
        ? false
        : row.missingPricesOnly === true || row.missingPricesOnly === 'true'
          ? true
          : undefined,
    filledPricesOnly:
      row.filledPricesOnly === true || row.filledPricesOnly === 'true' ? true : undefined,
    outOfStockOnly:
      row.outOfStockOnly === true || row.outOfStockOnly === 'true' ? true : undefined,
  }
}

export function parsePricelistPageLimit(raw: string | null | undefined): number {
  const n = parseInt(raw ?? String(PRICELIST_PAGE_SIZE), 10)
  if (!Number.isFinite(n) || n <= 0) return PRICELIST_PAGE_SIZE
  if ((PRICELIST_PAGE_SIZES as readonly number[]).includes(n)) return n
  return Math.min(MAX_PRICELIST_PAGE_SIZE, Math.max(PRICELIST_PAGE_SIZE, n))
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
  const nested = input.nested?.trim()

  let categoryFilter: PricelistListFilterInput['categoryFilter']
  if (category && category !== 'All') {
    const categories = await loadActiveCategories()
    categoryFilter =
      resolveShopCategoryFilter(categories, {
        category,
        subcategory: subcategory && subcategory !== 'All' ? subcategory : undefined,
        nested: nested && nested !== 'All' ? nested : undefined,
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

/** Admin-only "with price" filter; out-of-stock is also allowed for share-link guests. */
export function restrictAdminOnlyPricelistFilters(
  filters: PricelistListFilterInput,
  viewer: Pick<PricelistListViewer, 'role' | 'isSuperAdmin'>
): PricelistListFilterInput {
  const canUseAdminFilters = viewer.role === 'admin' || Boolean(viewer.isSuperAdmin)
  if (canUseAdminFilters) return filters

  if (viewer.role === 'guest') {
    if (filters.filledPricesOnly) {
      return {
        ...filters,
        filledPricesOnly: false,
        missingPricesOnly: true,
      }
    }
    return {
      ...filters,
      filledPricesOnly: false,
    }
  }

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

  const limit = parsePricelistPageLimit(searchParams.get('limit'))

  const exportAll = searchParams.get('export') === '1'
  const idsOnly = searchParams.get('ids') === '1'

  const category = searchParams.get('category')?.trim()
  const subcategory = searchParams.get('subcategory')?.trim()
  const nested = searchParams.get('nested')?.trim()
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
    nested,
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
