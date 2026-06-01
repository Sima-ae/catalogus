import { appPath } from '@/lib/paths'
import {
  PLATFORM_PRICELIST_OWNER_ID,
  PRICELIST_OWNER_QUERY_PLATFORM,
} from '@/lib/pricelist-constants'

export function buildPricelistShareUrl(ownerId: string): string {
  const owner =
    ownerId === PLATFORM_PRICELIST_OWNER_ID ? PRICELIST_OWNER_QUERY_PLATFORM : ownerId
  return appPath(`/pricelist?owner=${encodeURIComponent(owner)}`)
}
