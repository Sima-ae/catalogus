import { queryDb } from '@/lib/db'
import { CATALOG_MODE_KEY } from '@/lib/catalog-mode'
import { PRODUCT_CARD_SHOW_DETAILS_KEY } from '@/lib/product-card-display'
import { DEFAULT_SHOP_CURRENCY, normalizeCurrencyCode } from '@/lib/currency'
import { resolveSiteTagline } from '@/lib/site-tagline'
import type { Locale } from '@/lib/i18n-locale-registry'
import { getCategoryTranslationMessages } from '@/lib/category-translations-db'
import { getTagTranslationMessages } from '@/lib/tag-translations-db'
import { listActiveSiteTickerMessagesForLocale } from '@/lib/site-ticker-db'
import { resolveHostSiteBrand, resolveStoreModeFromHost } from '@/lib/store-host'
import { getCachedValue } from '@/lib/server-ttl-cache'
import { loadActiveCategories } from '@/lib/categories-persistence'
import type { CategoryTreeRow } from '@/lib/category-picker'
import {
  loadFeaturedBrandSettings,
  resolveFeaturedDisplayBrand,
  type FeaturedBrandSettings,
} from '@/lib/featured-brand'
import {
  getDefaultShopBootstrap,
  type LayoutBootstrapData,
  type ShopBootstrap,
} from '@/lib/shop-bootstrap-shared'

const SHOP_BOOTSTRAP_CACHE_NS = 'shop-bootstrap'
const SHOP_BOOTSTRAP_CACHE_TTL_MS = 30_000
const FEATURED_BRAND_CACHE_NS = 'featured-brand'
const FEATURED_BRAND_CACHE_TTL_MS = 30_000

export type { LayoutBootstrapData, ShopBootstrap } from '@/lib/shop-bootstrap-shared'
export { getDefaultShopBootstrap } from '@/lib/shop-bootstrap-shared'

function parseBoolSetting(value: string | null | undefined, defaultValue: boolean): boolean {
  const v = value?.trim().toLowerCase()
  if (!v) return defaultValue
  return v === 'true' || v === '1'
}

/**
 * Apply per-host branding. Featured hosts (1-1.club) use DB featured_* settings
 * (with HOST_SITE_BRAND as fallback for name/tagline).
 */
export function applyHostBrandToBootstrap(
  bootstrap: ShopBootstrap,
  hostname: string | null | undefined,
  featuredBrand?: FeaturedBrandSettings | null
): ShopBootstrap {
  const mode = resolveStoreModeFromHost(hostname)
  if (mode !== 'featured') {
    return {
      ...bootstrap,
      footer_menu: bootstrap.footer_menu || '',
      footer_copyright: bootstrap.footer_copyright || '',
      logo_path: bootstrap.logo_path || '',
      logo_path_white: bootstrap.logo_path_white || '',
    }
  }

  if (featuredBrand) {
    const display = resolveFeaturedDisplayBrand(featuredBrand, hostname)
    return {
      ...bootstrap,
      site_name: display.site_name,
      site_tagline: display.site_tagline || bootstrap.site_tagline,
      footer_menu: display.footer_menu,
      footer_copyright: display.footer_copyright,
      logo_path: display.logo_path,
      logo_path_white: display.logo_path_white,
    }
  }

  const brand = resolveHostSiteBrand(hostname)
  if (!brand) {
    return {
      ...bootstrap,
      footer_menu: '',
      footer_copyright: '1-1 Club © {year}',
    }
  }
  return {
    ...bootstrap,
    site_name: brand.site_name,
    site_tagline: brand.site_tagline?.trim() || bootstrap.site_tagline,
    footer_menu: '',
    footer_copyright: '1-1 Club © {year}',
  }
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
    footer_menu: '',
    footer_copyright: '',
    logo_path: '',
    logo_path_white: '',
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

async function loadFeaturedBrandCached(): Promise<FeaturedBrandSettings> {
  return getCachedValue(
    FEATURED_BRAND_CACHE_NS,
    'v1',
    FEATURED_BRAND_CACHE_TTL_MS,
    () => loadFeaturedBrandSettings()
  )
}

/** Root layout bootstrap — never throws; uses safe defaults when DB is unavailable. */
export async function loadLayoutBootstrapData(
  locale: Locale,
  hostname?: string | null
): Promise<LayoutBootstrapData> {
  const storeMode = resolveStoreModeFromHost(hostname)
  const loadFeatured = storeMode === 'featured'
  const [categoryResult, tagResult, bootstrapResult, tickerResult, categoryRowsResult, featuredResult] =
    await Promise.allSettled([
      getCategoryTranslationMessages(locale),
      getTagTranslationMessages(locale),
      loadShopBootstrap(locale),
      listActiveSiteTickerMessagesForLocale(locale, storeMode),
      loadActiveCategories(),
      loadFeatured ? loadFeaturedBrandCached() : Promise.resolve(null),
    ])

  const categoryMessages =
    categoryResult.status === 'fulfilled' ? categoryResult.value : {}
  const tagMessages = tagResult.status === 'fulfilled' ? tagResult.value : {}
  const bootstrapDegraded = bootstrapResult.status !== 'fulfilled'
  const featuredBrand =
    featuredResult.status === 'fulfilled' ? featuredResult.value : null
  const shopBootstrap = applyHostBrandToBootstrap(
    bootstrapResult.status === 'fulfilled'
      ? bootstrapResult.value
      : getDefaultShopBootstrap(locale),
    hostname,
    featuredBrand
  )
  const tickerMessages = tickerResult.status === 'fulfilled' ? tickerResult.value : []
  const categoryRows: CategoryTreeRow[] =
    categoryRowsResult.status === 'fulfilled'
      ? categoryRowsResult.value.map((row) => ({
          id: String(row.id ?? ''),
          name: String(row.name ?? ''),
          parent_id: row.parent_id ? String(row.parent_id) : null,
          parent_name: row.parent_name ? String(row.parent_name) : null,
          active: row.active,
        }))
      : []

  if (bootstrapDegraded) {
    console.error(
      'Layout shop bootstrap failed:',
      bootstrapResult.status === 'rejected' ? bootstrapResult.reason : 'unknown'
    )
  }

  // Do NOT warm catalog count buckets / nav tree here — layout runs on every HTML
  // response (including 404s and bots). Warm on first shop catalog API hit instead.

  return {
    categoryMessages,
    tagMessages,
    shopBootstrap,
    tickerMessages,
    categoryRows,
    bootstrapDegraded,
    storeMode,
  }
}

/** Gate / locked traffic — no MariaDB. Prevents scrapers redirected to the gate from burning CPU. */
export function getLightLayoutBootstrapData(
  locale: Locale,
  hostname?: string | null
): LayoutBootstrapData {
  const storeMode = resolveStoreModeFromHost(hostname)
  return {
    categoryMessages: {},
    tagMessages: {},
    shopBootstrap: applyHostBrandToBootstrap(getDefaultShopBootstrap(locale), hostname),
    tickerMessages: [],
    categoryRows: [],
    bootstrapDegraded: false,
    storeMode,
  }
}
