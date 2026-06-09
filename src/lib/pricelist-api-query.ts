import { loadActiveCategories } from '@/lib/categories-persistence'
import { defaultPricelistPageSize } from '@/lib/pricelist-items-query-string'
import type { PricelistListFilterInput } from '@/lib/pricelist-list-query'
import { resolveShopCategoryFilter } from '@/lib/shop-category-tree'

export type ParsedPricelistItemsQuery = {
  page: number
  limit: number
  exportAll: boolean
  filters: PricelistListFilterInput
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

  const search = searchParams.get('search')?.trim() || undefined
  const brandRaw = searchParams.get('brand')?.trim()
  const brand = brandRaw && brandRaw !== 'All' ? brandRaw : undefined

  const category = searchParams.get('category')?.trim()
  const subcategory = searchParams.get('subcategory')?.trim()

  let categoryFilter: PricelistListFilterInput['categoryFilter']
  if (category && category !== 'All') {
    const categories = await loadActiveCategories()
    categoryFilter =
      resolveShopCategoryFilter(categories, {
        category,
        subcategory: subcategory && subcategory !== 'All' ? subcategory : undefined,
      }) ?? { categoryIds: [], legacyNames: [], strictIdOnly: true }
  }

  const missingParam = searchParams.get('missingPrices')
  const missingPricesOnly = missingParam === null ? true : missingParam !== 'false'

  return {
    page,
    limit: exportAll ? 5000 : limit,
    exportAll,
    filters: {
      search,
      brand,
      categoryFilter,
      missingPricesOnly: exportAll ? false : missingPricesOnly,
    },
  }
}

