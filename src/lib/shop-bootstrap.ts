import { queryDb } from '@/lib/db'
import { CATALOG_MODE_KEY } from '@/lib/catalog-mode'
import { PRODUCT_CARD_SHOW_DETAILS_KEY } from '@/lib/product-card-display'
import { DEFAULT_SHOP_CURRENCY, normalizeCurrencyCode } from '@/lib/currency'
import { resolveSiteTagline } from '@/lib/site-tagline'
import type { Locale } from '@/lib/i18n-locale-registry'
import { getCategoryTranslationMessages } from '@/lib/category-translations-db'
import { getTagTranslationMessages } from '@/lib/tag-translations-db'
import { listActiveSiteTickerMessagesForLocale } from '@/lib/site-ticker-db'
import { getCachedValue } from '@/lib/server-ttl-cache'

const SHOP_BOOTSTRAP_CACHE_NS = 'shop-bootstrap'
const SHOP_BOOTSTRAP_CACHE_TTL_MS = 30_000
import {
  getDefaultShopBootstrap,
  type LayoutBootstrapData,
  type ShopBootstrap,
} from '@/lib/shop-bootstrap-shared'

export type { LayoutBootstrapData, ShopBootstrap } from '@/lib/shop-bootstrap-shared'
export { getDefaultShopBootstrap } from '@/lib/shop-bootstrap-shared'

function parseBoolSetting(value: string | null | undefined, defaultValue: boolean): boolean {
  const v = value?.trim().toLowerCase()
  if (!v) return defaultValue
  return v === 'true' || v === '1'
}

async function loadShopBootstrapFromDb(locale: Locale): Promise<ShopBootstrap> {
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

/** Single DB round-trip for storefront bootstrap (currency, catalog mode, card display). */
export async function loadShopBootstrap(locale: Locale): Promise<ShopBootstrap> {
  return getCachedValue(
    SHOP_BOOTSTRAP_CACHE_NS,
    locale,
    SHOP_BOOTSTRAP_CACHE_TTL_MS,
    () => loadShopBootstrapFromDb(locale)
  )
}

/** Root layout bootstrap — never throws; uses safe defaults when DB is unavailable. */
export async function loadLayoutBootstrapData(locale: Locale): Promise<LayoutBootstrapData> {
  const [categoryResult, tagResult, bootstrapResult, tickerResult] = await Promise.allSettled([
    getCategoryTranslationMessages(locale),
    getTagTranslationMessages(locale),
    loadShopBootstrap(locale),
    listActiveSiteTickerMessagesForLocale(locale),
  ])

  const categoryMessages =
    categoryResult.status === 'fulfilled' ? categoryResult.value : {}
  const tagMessages = tagResult.status === 'fulfilled' ? tagResult.value : {}
  const bootstrapDegraded = bootstrapResult.status !== 'fulfilled'
  const shopBootstrap =
    bootstrapResult.status === 'fulfilled'
      ? bootstrapResult.value
      : getDefaultShopBootstrap(locale)
  const tickerMessages = tickerResult.status === 'fulfilled' ? tickerResult.value : []

  if (bootstrapDegraded) {
    console.error(
      'Layout shop bootstrap failed:',
      bootstrapResult.status === 'rejected' ? bootstrapResult.reason : 'unknown'
    )
  }

  return { categoryMessages, tagMessages, shopBootstrap, tickerMessages, bootstrapDegraded }
}
