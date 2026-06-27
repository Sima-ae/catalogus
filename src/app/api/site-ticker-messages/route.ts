import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n'
import { listActiveSiteTickerMessagesForLocale } from '@/lib/site-ticker-db'
import { logDbRouteError } from '@/lib/db-route-log'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Public: active ticker lines for the requested UI locale. */
export async function GET(request: NextRequest) {
  const localeParam = request.nextUrl.searchParams.get('locale')
  const locale: Locale = isLocale(localeParam) ? localeParam : DEFAULT_LOCALE

  try {
    const messages = await listActiveSiteTickerMessagesForLocale(locale)
    return NextResponse.json({ messages })
  } catch (error) {
    logDbRouteError('GET /api/site-ticker-messages', error)
    return NextResponse.json({ messages: [] })
  }
}
