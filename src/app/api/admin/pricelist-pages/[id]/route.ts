import { NextRequest, NextResponse } from 'next/server'
import { superAdminDenial, verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import {
  countPricelistPageItems,
  deletePricelistPage,
  getPricelistPageById,
  ownerIdToSlug,
  updatePricelistPage,
} from '@/lib/pricelist-pages-db'
import { getPricelistShareSettings } from '@/lib/pricelist-share-db'
import { buildPricelistShareUrl } from '@/lib/pricelist-share-url'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const denied = superAdminDenial(auth)
  if (denied) return denied

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>

  try {
    const page = await updatePricelistPage(params.id, {
      slug: raw.slug != null ? String(raw.slug) : undefined,
      label: raw.label != null ? String(raw.label) : undefined,
      sortOrder: raw.sortOrder != null ? Number(raw.sortOrder) : undefined,
      active:
        raw.active === true || raw.active === false
          ? raw.active
          : raw.active === 1
            ? true
            : raw.active === 0
              ? false
              : undefined,
    })
    const [itemCount, share] = await Promise.all([
      countPricelistPageItems(page.id),
      getPricelistShareSettings(page.id),
    ])
    return NextResponse.json({
      ...page,
      sharePath: buildPricelistShareUrl(page.id),
      shareQuery: `owner=${ownerIdToSlug(page.id)}`,
      hasPassword: share.has_password,
      itemCount,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('not found') || msg.includes('Slug') || msg.includes('deactivate')) {
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    console.error('Admin pricelist pages PATCH:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to update pricelist page') },
      { status: 503 }
    )
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const auth = await verifyAdminActor(_request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const denied = superAdminDenial(auth)
  if (denied) return denied

  try {
    const existing = await getPricelistPageById(params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Pricelist page not found' }, { status: 404 })
    }
    await deletePricelistPage(params.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Cannot delete') || msg.includes('still has')) {
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    console.error('Admin pricelist pages DELETE:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to delete pricelist page') },
      { status: 503 }
    )
  }
}
