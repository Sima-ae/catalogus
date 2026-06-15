/** Shared platform pricelist owner (super admin + admin curate the same list). */
export const PLATFORM_PRICELIST_OWNER_ID = '00000000-0000-4000-8000-000000000001'

export const PRICELIST_OWNER_QUERY_PLATFORM = 'platform'

/** Allowed page sizes on the pricelist (same as admin products). */
export const PRICELIST_PAGE_SIZES = [50, 100, 250, 500] as const
export type PricelistPageSize = (typeof PRICELIST_PAGE_SIZES)[number]
export const MAX_PRICELIST_PAGE_SIZE = 500

/** Default rows per page on the pricelist table. */
export const PRICELIST_PAGE_SIZE: PricelistPageSize = 50

/** Max product IDs returned for “select all matching filters” (bulk select). */
export const PRICELIST_MAX_SELECTION_IDS = 100_000

export function isPlatformPricelistOwner(ownerId: string): boolean {
  return ownerId === PLATFORM_PRICELIST_OWNER_ID
}

/**
 * ORDER BY for ROW_NUMBER() when resolving the effective seller price row per product.
 * Shipping-only rows (unit_price 0, no stock status) must not beat rows with a saved price.
 */
export const SELLER_PRICE_LATEST_ROW_ORDER_SQL = `CASE
    WHEN unit_price > 0 THEN 0
    WHEN stock_status IS NOT NULL AND stock_status <> '' THEN 1
    WHEN COALESCE(out_of_stock, 0) <> 0 THEN 1
    ELSE 2
  END, updated_at DESC`

export function parsePricelistOwnerParam(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null
  const v = raw.trim()
  if (v === PRICELIST_OWNER_QUERY_PLATFORM) return PLATFORM_PRICELIST_OWNER_ID
  return v
}
