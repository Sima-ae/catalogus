import { PRICELIST_OWNER_QUERY_PLATFORM } from '@/lib/pricelist-constants'

export const ADMIN_PRICELIST_TARGET_KEY = 'catalogus.admin.pricelistTarget'
export const ADMIN_PRICELIST_TARGET_CHANGE_EVENT = 'catalogus:admin-pricelist-target-change'

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
  const trimmed = slug.trim()
  try {
    window.localStorage.setItem(ADMIN_PRICELIST_TARGET_KEY, trimmed)
    window.dispatchEvent(
      new CustomEvent(ADMIN_PRICELIST_TARGET_CHANGE_EVENT, { detail: trimmed })
    )
  } catch {
    /* ignore */
  }
}

export type PricelistTargetOption = {
  slug: string
  label: string
}
