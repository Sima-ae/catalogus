/** Shared platform pricelist owner (super admin + admin curate the same list). */
export const PLATFORM_PRICELIST_OWNER_ID = '00000000-0000-4000-8000-000000000001'

export const PRICELIST_OWNER_QUERY_PLATFORM = 'platform'

export const PRICELIST_PAGE_SIZE = 20

/** Max product IDs returned for “select all matching filters” (bulk select). */
export const PRICELIST_MAX_SELECTION_IDS = 100_000

export function isPlatformPricelistOwner(ownerId: string): boolean {
  return ownerId === PLATFORM_PRICELIST_OWNER_ID
}

export function parsePricelistOwnerParam(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null
  const v = raw.trim()
  if (v === PRICELIST_OWNER_QUERY_PLATFORM) return PLATFORM_PRICELIST_OWNER_ID
  return v
}
