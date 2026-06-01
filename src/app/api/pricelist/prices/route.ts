import { NextRequest, NextResponse } from 'next/server'
import { verifyCatalogActor } from '@/lib/catalog-user-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { parseUnitPrice, upsertSellerProductPrice } from '@/lib/pricelist-db'
import { assertSetPrices, requirePricelistAccess } from '@/lib/pricelist-api'
import { queryDb } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function getShopCurrency(): Promise<string> {
  const rows = await queryDb<{ value: string }[]>(
    `SELECT value FROM settings WHERE \`key\` = 'currency' LIMIT 1`
  )
  return rows[0]?.value?.trim() || 'EUR'
}

export async function PUT(request: NextRequest) {
  const auth = await verifyCatalogActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const productId = String(raw.productId ?? '').trim()
  const ownerParam = String(raw.ownerId ?? '').trim()
  const unitPrice = parseUnitPrice(raw.unitPrice)

  if (!productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }
  if (unitPrice === null) {
    return NextResponse.json({ error: 'Valid unit price is required' }, { status: 400 })
  }

  const access = await requirePricelistAccess(request, ownerParam || null)
  if (!access.ok || !access.actor) {
    return NextResponse.json({ error: access.ok ? 'Sign in required' : access.error }, { status: access.ok ? 401 : access.status })
  }

  const pricePerm = await assertSetPrices(access.actor, access.ownerId)
  if (!pricePerm.ok) {
    return NextResponse.json({ error: pricePerm.error }, { status: pricePerm.status })
  }

  try {
    const currency = await getShopCurrency()
    await upsertSellerProductPrice({
      sellerId: auth.actor.userId,
      productId,
      unitPrice,
      currency,
      updatedBy: auth.actor.userId,
    })
    return NextResponse.json({
      ok: true,
      unitPrice,
      currency,
      productId,
    })
  } catch (error) {
    console.error('Pricelist prices PUT:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to save price') },
      { status: 503 }
    )
  }
}
