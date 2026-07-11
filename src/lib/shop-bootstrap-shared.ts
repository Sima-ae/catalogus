import { DEFAULT_SHOP_CURRENCY } from '@/lib/currency'
import { resolveSiteTagline } from '@/lib/site-tagline'
import type { Locale } from '@/lib/i18n-locale-registry'
import type { TickerMessagePublic } from '@/lib/site-ticker'
import type { CategoryTreeRow } from '@/lib/category-picker'

export type ShopBootstrap = {
  catalogMode: boolean
  showCardDetails: boolean
  currency: string
  site_name: string
  site_tagline: string
}

export type LayoutBootstrapData = {
  categoryMessages: Record<string, string>
  tagMessages: Record<string, string>
  shopBootstrap: ShopBootstrap
  tickerMessages: TickerMessagePublic[]
  /** Active category tree rows — instant subcategory pills without an extra round-trip. */
  categoryRows: CategoryTreeRow[]
  /** True when server could not load shop settings from DB (client may retry). */
  bootstrapDegraded: boolean
}

export function getDefaultShopBootstrap(locale: Locale): ShopBootstrap {
  return {
    catalogMode: false,
    showCardDetails: true,
    currency: DEFAULT_SHOP_CURRENCY,
    site_name: 'Catalogus',
    site_tagline: resolveSiteTagline(locale, ''),
  }
}
