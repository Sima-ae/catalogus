import { PRICELIST_OWNER_QUERY_PLATFORM } from '@/lib/pricelist-constants'

export const ADMIN_PRICELIST_TARGET_KEY = 'catalogus.admin.pricelistTarget'

export function readAdminPricelistTargetSlug(): string {
  if (typeof window === 'undefined') return PRICELIST_OWNER_QUERY_PLATFORM
  try {
    const v = window.localStorage.getItem(ADMIN_PRICELIST_TARGET_KEY)?.trim()
    return v || PRICELIST_OWNER_QUERY_PLATFORM
  } catch {
    return PRICELIST_OWNER_QUERY_PLATFORM
  }
}

export function writeAdminPricelistTargetSlug(slug: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ADMIN_PRICELIST_TARGET_KEY, slug.trim())
  } catch {
    /* ignore */
  }
}

export type PricelistTargetOption = {
  slug: string
  label: string
}
