import { NextRequest, NextResponse } from 'next/server'
import { getDbErrorMessage } from '@/lib/db-errors'
import { isLocale, type Locale } from '@/lib/i18n'
import { defaultLocaleForStoreMode } from '@/lib/i18n-locale-registry'
import { getCategoryTranslationMessages } from '@/lib/category-translations-db'
import { getTagTranslationMessages } from '@/lib/tag-translations-db'
import { loadShopBootstrap, applyHostBrandToBootstrap } from '@/lib/shop-bootstrap'
import { loadFeaturedBrandSettings } from '@/lib/featured-brand'
import { listActiveSiteTickerMessagesForLocale } from '@/lib/site-ticker-db'
import { CATALOG_METADATA_CACHE_CONTROL, jsonCached } from '@/lib/http-cache'
import { resolveRequestHostname, resolveStoreModeFromHeaders } from '@/lib/store-host'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const storeScope = resolveStoreModeFromHeaders(request.headers)
  const localeParam = request.nextUrl.searchParams.get('locale')
  const locale: Locale = isLocale(localeParam)
    ? localeParam
    : defaultLocaleForStoreMode(storeScope)

  try {
    const hostname = resolveRequestHostname(request.headers)
    const [categoryMessages, tagMessages, bootstrapRaw, tickerMessages, featuredBrand] =
      await Promise.all([
        getCategoryTranslationMessages(locale),
        getTagTranslationMessages(locale),
        loadShopBootstrap(locale),
        listActiveSiteTickerMessagesForLocale(locale, storeScope),
        storeScope === 'featured' ? loadFeaturedBrandSettings() : Promise.resolve(null),
      ])
    const bootstrap = applyHostBrandToBootstrap(bootstrapRaw, hostname, featuredBrand)
    return jsonCached(
      { categoryMessages, tagMessages, bootstrap, tickerMessages, storeMode: storeScope },
      CATALOG_METADATA_CACHE_CONTROL
    )
  } catch (error) {
    console.error('Shop bootstrap API:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load shop bootstrap') },
      { status: 503 }
    )
  }
}
