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
  /** Optional footer menu / blurb above copyright (plain text; newlines kept). */
  footer_menu: string
  /** Empty = use i18n `footer.copyright`. May include `{year}`. */
  footer_copyright: string
  /** Custom header logo URL (light backgrounds). Empty = default Super Clones asset. */
  logo_path: string
  /** Custom header logo URL (dark backgrounds). Empty = falls back to logo_path / default. */
  logo_path_white: string
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
  /** Request host store mode (default = Super Clones, featured = 1-1.club). */
  storeMode: 'default' | 'featured'
}

export function getDefaultShopBootstrap(locale: Locale): ShopBootstrap {
  return {
    catalogMode: false,
    showCardDetails: true,
    currency: DEFAULT_SHOP_CURRENCY,
    site_name: 'Catalogus',
    site_tagline: resolveSiteTagline(locale, ''),
    footer_menu: '',
    footer_copyright: '',
    logo_path: '',
    logo_path_white: '',
  }
}
