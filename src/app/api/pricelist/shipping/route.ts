import { NextRequest, NextResponse } from 'next/server'
import { queryDb } from '@/lib/db'
import { getDbErrorMessage } from '@/lib/db-errors'
import { isCuratedSupplierPricelist } from '@/lib/pricelist-pages-db'
import {
  clearSellerProductShippingCost,
  parseUnitPrice,
  syncProductShippingCostFromPricelist,
  upsertSellerProductShippingCost,
} from '@/lib/pricelist-db'
import {
  applyPricelistContributorCookie,
  requirePricelistAccess,
  resolvePricelistPriceActor,
} from '@/lib/pricelist-api'
import { assertSellerMayUpdateShipping } from '@/lib/seller-price-edit-db'

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
  const sellerIdParam = String(raw.sellerId ?? '').trim()
  const shippingCost = parseUnitPrice(raw.shippingCost)

  if (!productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }
  if (shippingCost === null) {
    return NextResponse.json({ error: 'Valid shipping cost is required' }, { status: 400 })
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

  const isSellerActor = access.mode === 'full' && access.actor?.role === 'seller'
  const isAdminActor = access.mode === 'full' && access.actor?.role === 'admin'

  if (isSellerActor) {
    const mayUpdate = await assertSellerMayUpdateShipping(
      access.ownerId,
      sellerId,
      productId
    )
    if (!mayUpdate.ok) {
      return NextResponse.json(
        { error: mayUpdate.error, code: 'SHIPPING_LOCKED' },
        { status: 403 }
      )
    }
  }

  const targetSellerId = isAdminActor && sellerIdParam ? sellerIdParam : sellerId
  const updatedBy =
    access.mode === 'full' && access.actor ? access.actor.userId : targetSellerId

  try {
    const currency = await getShopCurrency()
    await upsertSellerProductShippingCost({
      listOwnerId: access.ownerId,
      sellerId: targetSellerId,
      productId,
      shippingCost,
      currency,
      updatedBy,
    })
    if (isCuratedSupplierPricelist(access.ownerId)) {
      await syncProductShippingCostFromPricelist(productId, access.ownerId)
    }
    const res = NextResponse.json({
      ok: true,
      shippingCost,
      currency,
      productId,
      sellerId: targetSellerId,
    })
    if (priceActor.actor.kind === 'guest') {
      applyPricelistContributorCookie(res, priceActor.actor.setContributorCookie)
    }
    return res
  } catch (error) {
    console.error('Pricelist shipping PUT:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to save shipping cost') },
      { status: 503 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const productId = String(raw.productId ?? '').trim()
  const ownerParam = String(raw.ownerId ?? '').trim()
  const sellerIdParam = String(raw.sellerId ?? '').trim()

  if (!productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }

  const access = await requirePricelistAccess(request, ownerParam || null)
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }
  if (!access.actor?.isSuperAdmin) {
    return NextResponse.json({ error: 'Only super admin can clear shipping costs' }, { status: 403 })
  }

  const targetSellerId = sellerIdParam || access.actor.userId

  try {
    const removed = await clearSellerProductShippingCost(
      access.ownerId,
      targetSellerId,
      productId
    )
    if (!removed) {
      return NextResponse.json({ error: 'Shipping cost not found' }, { status: 404 })
    }
    if (isCuratedSupplierPricelist(access.ownerId)) {
      await syncProductShippingCostFromPricelist(productId, access.ownerId)
    }
    return NextResponse.json({ ok: true, productId, sellerId: targetSellerId })
  } catch (error) {
    console.error('Pricelist shipping DELETE:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to clear shipping cost') },
      { status: 503 }
    )
  }
}
