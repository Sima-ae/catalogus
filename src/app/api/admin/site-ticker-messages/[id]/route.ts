import { NextRequest, NextResponse } from 'next/server'
import { superAdminDenial, verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { logDbRouteError } from '@/lib/db-route-log'
import {
  deleteSiteTickerMessage,
  getSiteTickerMessageById,
  updateSiteTickerMessage,
} from '@/lib/site-ticker-db'
import { hasAnyTickerText, normalizeTickerTranslations } from '@/lib/site-ticker'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Super admin: update a ticker row. */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const denied = superAdminDenial(await verifyAdminActor(request))
  if (denied) return denied

  const { id: idParam } = await ctx.params
  const id = parseId(idParam)
  if (!id) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const patch: {
    translations?: ReturnType<typeof normalizeTickerTranslations>
    isActive?: boolean
    sortOrder?: number
  } = {}

  if ('translations' in body) {
    const translations = normalizeTickerTranslations(
      (body as Record<string, unknown>).translations
    )
    if (!hasAnyTickerText(translations)) {
      return NextResponse.json({ error: 'At least one translation is required' }, { status: 400 })
    }
    patch.translations = translations
  }
  if ('isActive' in body) {
    patch.isActive = (body as Record<string, unknown>).isActive === true
  }
  if ('sortOrder' in body) {
    const sortOrder = (body as Record<string, unknown>).sortOrder
    if (typeof sortOrder === 'number' && Number.isFinite(sortOrder)) {
      patch.sortOrder = Math.floor(sortOrder)
    }
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }

  try {
    const item = await updateSiteTickerMessage(id, patch)
    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ item })
  } catch (error) {
    logDbRouteError('PATCH /api/admin/site-ticker-messages/[id]', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to update ticker message') },
      { status: 503 }
    )
  }
}

/** Super admin: delete a ticker row. */
export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const denied = superAdminDenial(await verifyAdminActor(_request))
  if (denied) return denied

  const { id: idParam } = await ctx.params
  const id = parseId(idParam)
  if (!id) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  try {
    const existed = await getSiteTickerMessageById(id)
    if (!existed) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    await deleteSiteTickerMessage(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    logDbRouteError('DELETE /api/admin/site-ticker-messages/[id]', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to delete ticker message') },
      { status: 503 }
    )
  }
}
