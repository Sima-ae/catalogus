import { NextRequest, NextResponse } from 'next/server'
import { superAdminDenial, verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { logDbRouteError } from '@/lib/db-route-log'
import {
  createSiteTickerMessage,
  listAllSiteTickerMessages,
} from '@/lib/site-ticker-db'
import { hasAnyTickerText, normalizeTickerTranslations } from '@/lib/site-ticker'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Super admin: list all ticker rows. */
export async function GET(request: NextRequest) {
  const denied = superAdminDenial(await verifyAdminActor(request))
  if (denied) return denied

  try {
    const items = await listAllSiteTickerMessages()
    return NextResponse.json({ items })
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
  const translations = normalizeTickerTranslations(
    (body as Record<string, unknown>).translations
  )
  if (!hasAnyTickerText(translations)) {
    return NextResponse.json({ error: 'At least one translation is required' }, { status: 400 })
  }

  const isActive = (body as Record<string, unknown>).isActive === false ? false : true
  const sortOrderRaw = (body as Record<string, unknown>).sortOrder
  const sortOrder =
    typeof sortOrderRaw === 'number' && Number.isFinite(sortOrderRaw)
      ? Math.floor(sortOrderRaw)
      : null

  try {
    const item = await createSiteTickerMessage({ translations, isActive, sortOrder })
    return NextResponse.json({ item })
  } catch (error) {
    logDbRouteError('POST /api/admin/site-ticker-messages', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to create ticker message') },
      { status: 503 }
    )
  }
}
