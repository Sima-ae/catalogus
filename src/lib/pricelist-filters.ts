import type { PricelistRow } from '@/lib/pricelist-db'

const EMPTY_MARKER = '—'

function isFilterableValue(value: string | null | undefined): value is string {
  const v = value?.trim()
  return Boolean(v && v !== EMPTY_MARKER)
}

export function collectPricelistFilterOptions(items: PricelistRow[]): {
  categories: string[]
  brands: string[]
} {
  const categories = new Set<string>()
  const brands = new Set<string>()
  for (const row of items) {
    if (isFilterableValue(row.category)) categories.add(row.category.trim())
    if (isFilterableValue(row.brand)) brands.add(row.brand.trim())
  }
  const sort = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' })
  return {
    categories: Array.from(categories).sort(sort),
    brands: Array.from(brands).sort(sort),
  }
}

/** Row still needs a price filled in (matches empty price field in the table). */
export function pricelistRowNeedsPrice(row: PricelistRow): boolean {
  if (row.can_edit_price === false) return false
  const raw = row.seller_unit_price ?? row.display_unit_price
  if (raw == null) return true
  const n = Number(raw)
  return !Number.isFinite(n) || n < 0
}

export function countPricelistRowsNeedingPrice(items: PricelistRow[]): number {
  let n = 0
  for (const row of items) {
    if (pricelistRowNeedsPrice(row)) n++
  }
  return n
}

export function filterPricelistRows(
  items: PricelistRow[],
  opts: {
    searchQuery?: string
    categoryFilter?: string
    brandFilter?: string
    missingPricesOnly?: boolean
  }
): PricelistRow[] {
  let list = items
  const category = opts.categoryFilter?.trim()
  const brand = opts.brandFilter?.trim()
  if (category) {
    list = list.filter((row) => row.category?.trim() === category)
  }
  if (brand) {
    list = list.filter((row) => row.brand?.trim() === brand)
  }
  if (opts.missingPricesOnly) {
    list = list.filter(pricelistRowNeedsPrice)
  }
  const q = opts.searchQuery?.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (row) =>
        row.name.toLowerCase().includes(q) || row.sku.toLowerCase().includes(q)
    )
  }
  return list
}
