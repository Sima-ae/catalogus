import { appPath } from '@/lib/paths'
import {
  PLATFORM_PRICELIST_OWNER_ID,
  PRICELIST_OWNER_QUERY_PLATFORM,
} from '@/lib/pricelist-constants'

/** Build share URL using slug or owner id (client-safe — no DB). */
export function buildPricelistShareUrl(ownerIdOrSlug: string): string {
  const owner =
    ownerIdOrSlug === PLATFORM_PRICELIST_OWNER_ID
      ? PRICELIST_OWNER_QUERY_PLATFORM
      : ownerIdOrSlug
  return appPath(`/pricelist?owner=${encodeURIComponent(owner)}`)
}
