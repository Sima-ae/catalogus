import type { PricelistRow } from '@/lib/pricelist-db'
import {
  brandCompoundIncludesSegment,
  CATEGORY_PATH_SEPARATOR,
  parseCategoryCompound,
} from '@/lib/product-taxonomy'
import { productMatchesShopCategoryFilter } from '@/lib/product-category-match'
import type { ShopCategoryFilterResult } from '@/lib/shop-category-tree'

const EMPTY_MARKER = '—'

function normalizeFilterKey(value: string): string {
  return value.trim().toLowerCase()
}

function categoryPartsFromRow(raw: string): Set<string> {
  const parts = new Set<string>()
  for (const segment of parseCategoryCompound(raw)) {
    const trimmed = segment.trim()
    if (!trimmed) continue
    parts.add(normalizeFilterKey(trimmed))
    if (trimmed.includes(CATEGORY_PATH_SEPARATOR)) {
      for (const piece of trimmed.split(CATEGORY_PATH_SEPARATOR)) {
        const p = piece.trim()
        if (p) parts.add(normalizeFilterKey(p))
      }
    }
  }
  return parts
}

export function pricelistRowMatchesCategoryFilter(
  row: PricelistRow,
  category?: string,
  subcategory?: string
): boolean {
  if (!category || category === 'All') return true
  const raw = row.category?.trim()
  if (!raw || raw === EMPTY_MARKER) return false

  const parts = categoryPartsFromRow(raw)
  if (subcategory && subcategory !== 'All') {
    return parts.has(normalizeFilterKey(subcategory))
  }

  return parts.has(normalizeFilterKey(category))
}

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
/** Row can be included in pricelist bulk selection / updates. */
export function isPricelistRowBulkEditable(
  row: PricelistRow,
  opts?: { isSeller?: boolean }
): boolean {
  if (row.can_edit_price === false) return false
  if (opts?.isSeller && row.price_locked) return false
  return true
}

export function isPricelistRowBulkEditableShipping(
  row: PricelistRow,
  opts?: { isSeller?: boolean }
): boolean {
  if (row.can_edit_shipping === false) return false
  if (opts?.isSeller && row.seller_shipping_cost != null) return false
  return true
}

/** Row can be bulk-selected when price and/or shipping is still editable. */
export function isPricelistRowBulkSelectable(
  row: PricelistRow,
  opts?: { isSeller?: boolean }
): boolean {
  return (
    isPricelistRowBulkEditable(row, opts) ||
    isPricelistRowBulkEditableShipping(row, opts)
  )
}

export function pricelistRowIsOutOfStock(row: PricelistRow): boolean {
  if (row.seller_stock_status === 'out' || row.seller_stock_status === 'temporary') return true
  if (row.display_stock_status === 'out' || row.display_stock_status === 'temporary') return true
  return false
}

export function pricelistRowHasFilledShipping(
  row: PricelistRow,
  opts?: { isSeller?: boolean }
): boolean {
  if (row.can_edit_shipping === false && row.display_shipping_cost == null) return false
  const raw = opts?.isSeller
    ? row.seller_shipping_cost ?? row.display_shipping_cost
    : row.display_shipping_cost ?? row.seller_shipping_cost
  return raw != null && Number.isFinite(Number(raw))
}

/** Row still needs work: missing purchase price and/or missing shipping. */
export function pricelistRowIncomplete(
  row: PricelistRow,
  opts?: { guestShareLink?: boolean; isSeller?: boolean }
): boolean {
  if (pricelistRowIsOutOfStock(row)) return false
  if (pricelistRowNeedsPrice(row, opts)) return true
  if (pricelistRowHasFilledPrice(row) && !pricelistRowHasFilledShipping(row, opts)) return true
  return false
}

export function pricelistRowNeedsPrice(
  row: PricelistRow,
  opts?: { guestShareLink?: boolean }
): boolean {
  if (row.can_edit_price === false) return false
  const raw = row.seller_unit_price ?? row.display_unit_price
  if (row.seller_stock_status || row.display_stock_status) return false
  if (raw == null) return true
  const n = Number(raw)
  return !Number.isFinite(n) || n < 0
}

/** Row has a saved numeric price (green field in the table). */
export function pricelistRowHasFilledPrice(row: PricelistRow): boolean {
  if (row.seller_stock_status || row.display_stock_status) return false
  const raw = row.seller_unit_price ?? row.display_unit_price
  if (raw == null) return false
  const n = Number(raw)
  return Number.isFinite(n) && n > 0
}

export function countPricelistRowsWithFilledPrice(items: PricelistRow[]): number {
  let n = 0
  for (const row of items) {
    if (pricelistRowHasFilledPrice(row)) n++
  }
  return n
}

export function countPricelistRowsNeedingPrice(
  items: PricelistRow[],
  opts?: { guestShareLink?: boolean }
): number {
  let n = 0
  for (const row of items) {
    if (pricelistRowIncomplete(row, opts)) n++
  }
  return n
}

export function filterPricelistRows(
  items: PricelistRow[],
  opts: {
    searchQuery?: string
    categoryFilter?: string
    subcategoryFilter?: string
    /** Resolved shop category filter — preferred over bare name matching. */
    shopCategoryFilter?: ShopCategoryFilterResult | null
    brandFilter?: string
    missingPricesOnly?: boolean
    guestShareLink?: boolean
  }
): PricelistRow[] {
  let list = items
  const category = opts.categoryFilter?.trim()
  const subcategory = opts.subcategoryFilter?.trim()
  const brand = opts.brandFilter?.trim()
  if (category && category !== 'All') {
    if (opts.shopCategoryFilter !== undefined) {
      if (opts.shopCategoryFilter === null) {
        list = list.filter((row) =>
          pricelistRowMatchesCategoryFilter(row, category, subcategory)
        )
      } else {
        list = list.filter((row) =>
          productMatchesShopCategoryFilter(row, opts.shopCategoryFilter ?? undefined)
        )
      }
    } else {
      list = list.filter((row) =>
        pricelistRowMatchesCategoryFilter(row, category, subcategory)
      )
    }
  }
  if (brand && brand !== 'All') {
    list = list.filter((row) => brandCompoundIncludesSegment(row.brand ?? '', brand))
  }
  if (opts.missingPricesOnly) {
    const needOpts = opts.guestShareLink ? { guestShareLink: true as const } : undefined
    list = list.filter((row) => pricelistRowIncomplete(row, needOpts))
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
