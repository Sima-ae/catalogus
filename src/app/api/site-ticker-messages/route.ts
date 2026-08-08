import { NextRequest, NextResponse } from 'next/server'
import { isLocale, type Locale } from '@/lib/i18n'
import { defaultLocaleForStoreMode } from '@/lib/i18n-locale-registry'
import { listActiveSiteTickerMessagesForLocale } from '@/lib/site-ticker-db'
import { logDbRouteError } from '@/lib/db-route-log'
import { resolveStoreModeFromHeaders } from '@/lib/store-host'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Public: active ticker lines for the requested UI locale and this host's storefront. */
export async function GET(request: NextRequest) {
  const storeScope = resolveStoreModeFromHeaders(request.headers)
  const localeParam = request.nextUrl.searchParams.get('locale')
  const locale: Locale = isLocale(localeParam)
    ? localeParam
    : defaultLocaleForStoreMode(storeScope)

  try {
    const messages = await listActiveSiteTickerMessagesForLocale(locale, storeScope)
    return NextResponse.json({ messages, storeScope })
  } catch (error) {
    logDbRouteError('GET /api/site-ticker-messages', error)
    return NextResponse.json({ messages: [] })
  }
}
