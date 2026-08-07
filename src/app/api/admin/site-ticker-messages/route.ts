import { NextRequest, NextResponse } from 'next/server'
import { superAdminDenial, verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { logDbRouteError } from '@/lib/db-route-log'
import {
  createSiteTickerMessage,
  listAllSiteTickerMessages,
} from '@/lib/site-ticker-db'
import {
  hasAnyTickerText,
  normalizeTickerTranslations,
  parseTickerStoreScope,
} from '@/lib/site-ticker'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Super admin: list ticker rows for one storefront scope. */
export async function GET(request: NextRequest) {
  const denied = superAdminDenial(await verifyAdminActor(request))
  if (denied) return denied

  const storeScope = parseTickerStoreScope(request.nextUrl.searchParams.get('storeScope'))

  try {
    const items = await listAllSiteTickerMessages(storeScope)
    return NextResponse.json({ items, storeScope })
  } catch (error) {
    logDbRouteError('GET /api/admin/site-ticker-messages', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load ticker messages') },
      { status: 503 }
    )
  }
}

/** Super admin: create a ticker row. */
export async function POST(request: NextRequest) {
  const denied = superAdminDenial(await verifyAdminActor(request))
  if (denied) return denied

  const body = await request.json().catch(() => ({}))
  const bodyRec = body as Record<string, unknown>
  const translations = normalizeTickerTranslations(bodyRec.translations)
  if (!hasAnyTickerText(translations)) {
    return NextResponse.json({ error: 'At least one translation is required' }, { status: 400 })
  }

  const storeScope = parseTickerStoreScope(bodyRec.storeScope)
  const isActive = bodyRec.isActive === false ? false : true
  const sortOrderRaw = bodyRec.sortOrder
  const sortOrder =
    typeof sortOrderRaw === 'number' && Number.isFinite(sortOrderRaw)
      ? Math.floor(sortOrderRaw)
      : null

  try {
    const item = await createSiteTickerMessage({
      translations,
      storeScope,
      isActive,
      sortOrder,
    })
    return NextResponse.json({ item })
  } catch (error) {
    logDbRouteError('POST /api/admin/site-ticker-messages', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to create ticker message') },
      { status: 503 }
    )
  }
}
