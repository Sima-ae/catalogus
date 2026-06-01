import { NextRequest, NextResponse } from 'next/server'
import { verifyCatalogActor } from '@/lib/catalog-user-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { requirePricelistAccess } from '@/lib/pricelist-api'
import { createPriceEditRequest } from '@/lib/seller-price-edit-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const auth = await verifyCatalogActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  if (auth.actor.role !== 'seller') {
    return NextResponse.json({ error: 'Only sellers can request price edits' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const productId = String(raw.productId ?? '').trim()
  const ownerParam = String(raw.ownerId ?? '').trim()

  if (!productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }

  const access = await requirePricelistAccess(request, ownerParam || null)
  if (!access.ok || !access.actor) {
    return NextResponse.json({ error: access.ok ? 'Sign in required' : access.error }, { status: access.ok ? 401 : access.status })
  }

  try {
    const row = await createPriceEditRequest({
      sellerId: auth.actor.userId,
      productId,
      listOwnerId: access.ownerId,
    })
    return NextResponse.json({ ok: true, request: row })
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    if (msg === 'PRICE_NOT_LOCKED') {
      return NextResponse.json({ error: 'Price is not locked or not set yet' }, { status: 400 })
    }
    console.error('Price edit request POST:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to submit request') },
      { status: 503 }
    )
  }
}
