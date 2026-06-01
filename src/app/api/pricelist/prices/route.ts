import { NextRequest, NextResponse } from 'next/server'
import { getDbErrorMessage } from '@/lib/db-errors'
import { parseUnitPrice, upsertSellerProductPrice } from '@/lib/pricelist-db'
import {
  applyPricelistContributorCookie,
  requirePricelistAccess,
  resolvePricelistPriceActor,
} from '@/lib/pricelist-api'
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

  const access = await requirePricelistAccess(request, ownerParam || null, { allowGuest: true })
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const priceActor = await resolvePricelistPriceActor(request, access)
  if (!priceActor.ok) {
    return NextResponse.json({ error: priceActor.error }, { status: priceActor.status })
  }

  const sellerId =
    priceActor.actor.kind === 'guest'
      ? priceActor.actor.contributorId
      : priceActor.actor.userId

  try {
    const currency = await getShopCurrency()
    await upsertSellerProductPrice({
      sellerId,
      productId,
      unitPrice,
      currency,
      updatedBy: sellerId,
    })
    const res = NextResponse.json({
      ok: true,
      unitPrice,
      currency,
      productId,
    })
    if (priceActor.actor.kind === 'guest') {
      applyPricelistContributorCookie(res, priceActor.actor.setContributorCookie)
    }
    return res
  } catch (error) {
    console.error('Pricelist prices PUT:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to save price') },
      { status: 503 }
    )
  }
}
