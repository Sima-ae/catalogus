import { NextRequest, NextResponse } from 'next/server'
import { getTagTranslationMessages } from '@/lib/tag-translations-db'
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n-locale-registry'
import { CATALOG_METADATA_CACHE_CONTROL, jsonCached } from '@/lib/http-cache'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Localized product tag labels for the active shop locale. */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('locale')?.trim()
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE
  const messages = await getTagTranslationMessages(locale)
  return jsonCached(messages, CATALOG_METADATA_CACHE_CONTROL)
}
