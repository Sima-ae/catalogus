import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { bulkAddPricelistItems, bulkRemovePricelistItems } from '@/lib/pricelist-db'
import { requirePricelistAccess, assertManageItems } from '@/lib/pricelist-api'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const action = String(raw.action ?? 'add').trim()
  const ownerParam = String(raw.ownerId ?? 'platform').trim()
  const productIds = Array.isArray(raw.productIds)
    ? raw.productIds.map((id) => String(id).trim()).filter(Boolean)
    : []

  if (!productIds.length) {
    return NextResponse.json({ error: 'productIds is required' }, { status: 400 })
  }

  const access = await requirePricelistAccess(request, ownerParam || null)
  if (!access.ok || !access.actor) {
    return NextResponse.json(
      { error: access.ok ? 'Sign in required' : access.error },
      { status: access.ok ? 401 : access.status }
    )
  }

  const manage = await assertManageItems(access.actor, access.ownerId)
  if (!manage.ok) {
    return NextResponse.json({ error: manage.error }, { status: manage.status })
  }

  try {
    if (action === 'remove') {
      const result = await bulkRemovePricelistItems(access.ownerId, productIds)
      return NextResponse.json({ ok: true, action: 'remove', ...result })
    }

    const result = await bulkAddPricelistItems({
      ownerUserId: access.ownerId,
      productIds,
      addedByUserId: auth.actor.userId,
    })
    return NextResponse.json({ ok: true, action: 'add', ...result })
  } catch (error) {
    console.error('Admin products pricelist bulk POST:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to update pricelist membership') },
      { status: 503 }
    )
  }
}
