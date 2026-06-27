import { NextRequest, NextResponse } from 'next/server'
import { getDbErrorMessage } from '@/lib/db-errors'
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n'
import { getCategoryTranslationMessages } from '@/lib/category-translations-db'
import { getTagTranslationMessages } from '@/lib/tag-translations-db'
import { loadShopBootstrap } from '@/lib/shop-bootstrap'
import { listActiveSiteTickerMessagesForLocale } from '@/lib/site-ticker-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const localeParam = request.nextUrl.searchParams.get('locale')
  const locale: Locale = isLocale(localeParam) ? localeParam : DEFAULT_LOCALE

  try {
    const [categoryMessages, tagMessages, bootstrap, tickerMessages] = await Promise.all([
      getCategoryTranslationMessages(locale),
      getTagTranslationMessages(locale),
      loadShopBootstrap(locale),
      listActiveSiteTickerMessagesForLocale(locale),
    ])
    return NextResponse.json({ categoryMessages, tagMessages, bootstrap, tickerMessages })
  } catch (error) {
    console.error('Shop bootstrap API:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load shop bootstrap') },
      { status: 503 }
    )
  }
}
