import { queryDb } from '@/lib/db'
import { CATALOG_MODE_KEY } from '@/lib/catalog-mode'
import { PRODUCT_CARD_SHOW_DETAILS_KEY } from '@/lib/product-card-display'
import { DEFAULT_SHOP_CURRENCY, normalizeCurrencyCode } from '@/lib/currency'
import { resolveSiteTagline } from '@/lib/site-tagline'
import type { Locale } from '@/lib/i18n-locale-registry'

export type ShopBootstrap = {
  catalogMode: boolean
  showCardDetails: boolean
  currency: string
  site_name: string
  site_tagline: string
}

function parseBoolSetting(value: string | null | undefined, defaultValue: boolean): boolean {
  const v = value?.trim().toLowerCase()
  if (!v) return defaultValue
  return v === 'true' || v === '1'
}

/** Single DB round-trip for storefront bootstrap (currency, catalog mode, card display). */
export async function loadShopBootstrap(locale: Locale): Promise<ShopBootstrap> {
  const keys = [CATALOG_MODE_KEY, PRODUCT_CARD_SHOW_DETAILS_KEY, 'currency', 'site_name', 'site_tagline']
  const placeholders = keys.map(() => '?').join(', ')
  const rows = await queryDb<{ key: string; value: string | null }[]>(
    `SELECT \`key\`, value FROM settings WHERE \`key\` IN (${placeholders})`,
    keys
  )
  const map = new Map(rows.map((r) => [r.key, r.value]))

  return {
    catalogMode: parseBoolSetting(map.get(CATALOG_MODE_KEY), false),
    showCardDetails: parseBoolSetting(map.get(PRODUCT_CARD_SHOW_DETAILS_KEY), true),
    currency: normalizeCurrencyCode(map.get('currency') || DEFAULT_SHOP_CURRENCY),
    site_name: map.get('site_name')?.trim() || 'Catalogus',
    site_tagline: resolveSiteTagline(locale, map.get('site_tagline') ?? ''),
  }
}
