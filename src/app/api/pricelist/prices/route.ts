import { NextRequest, NextResponse } from 'next/server'
import { queryDb } from '@/lib/db'
import { getDbErrorMessage } from '@/lib/db-errors'
import { isCuratedSupplierPricelist } from '@/lib/pricelist-pages-db'
import {
  parseUnitPrice,
  setSellerProductStockStatus,
  syncProductPurchasePriceFromPricelist,
  upsertSellerProductPrice,
  deleteSellerProductPrice,
} from '@/lib/pricelist-db'
import { isPricelistStockStatus } from '@/lib/pricelist-stock-status'
import {
  applyPricelistContributorCookie,
  requirePricelistAccess,
  resolvePricelistPriceActor,
} from '@/lib/pricelist-api'
import {
  assertSellerMayUpdatePrice,
  lockSellerPriceAfterSave,
  clearPendingEditRequestsForPrice,
} from '@/lib/seller-price-edit-db'

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
  const stockStatusRaw = String(raw.stockStatus ?? '').trim()
  const legacyOutOfStock =
    raw.outOfStock === true || raw.outOfStock === 1 || raw.outOfStock === 'true'
  const stockStatus = isPricelistStockStatus(stockStatusRaw)
    ? stockStatusRaw
    : legacyOutOfStock
      ? 'out'
      : null
  const unitPrice = parseUnitPrice(raw.unitPrice)

  if (!productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }
  if (!stockStatus && unitPrice === null) {
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

  const isSellerActor = access.mode === 'full' && access.actor?.role === 'seller'
  const isAdminActor = access.mode === 'full' && access.actor?.role === 'admin'

  if (isSellerActor) {
    const mayUpdate = await assertSellerMayUpdatePrice(
      access.ownerId,
      sellerId,
      productId
    )
    if (!mayUpdate.ok) {
      return NextResponse.json({ error: mayUpdate.error, code: 'PRICE_LOCKED' }, { status: 403 })
    }
  }

  const targetSellerId =
    isAdminActor && sellerIdParam ? sellerIdParam : sellerId
  const updatedBy =
    access.mode === 'full' && access.actor ? access.actor.userId : targetSellerId

  try {
    const currency = await getShopCurrency()
    if (stockStatus) {
      await setSellerProductStockStatus({
        listOwnerId: access.ownerId,
        sellerId: targetSellerId,
        productId,
        stockStatus,
        currency,
        updatedBy,
        syncProductSoldOut: isCuratedSupplierPricelist(access.ownerId),
      })
    } else {
      await upsertSellerProductPrice({
        listOwnerId: access.ownerId,
        sellerId: targetSellerId,
        productId,
        unitPrice: unitPrice!,
        currency,
        updatedBy,
      })
    }
    if (isSellerActor) {
      await lockSellerPriceAfterSave(access.ownerId, sellerId, productId)
    }
    if (isAdminActor && targetSellerId !== access.actor!.userId) {
      await clearPendingEditRequestsForPrice(targetSellerId, productId)
    }
    if (isCuratedSupplierPricelist(access.ownerId) && !stockStatus) {
      await syncProductPurchasePriceFromPricelist(productId, access.ownerId)
    }
    const res = NextResponse.json({
      ok: true,
      stockStatus,
      unitPrice: stockStatus ? null : unitPrice,
      currency,
      productId,
      sellerId: targetSellerId,
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
    return NextResponse.json({ error: 'Only super admin can clear prices' }, { status: 403 })
  }

  const targetSellerId = sellerIdParam || access.actor.userId

  try {
    const removed = await deleteSellerProductPrice(
      access.ownerId,
      targetSellerId,
      productId
    )
    if (!removed) {
      return NextResponse.json({ error: 'Price not found' }, { status: 404 })
    }
    await clearPendingEditRequestsForPrice(targetSellerId, productId)
    if (isCuratedSupplierPricelist(access.ownerId)) {
      await syncProductPurchasePriceFromPricelist(productId, access.ownerId)
    }
    return NextResponse.json({ ok: true, productId, sellerId: targetSellerId })
  } catch (error) {
    console.error('Pricelist prices DELETE:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to clear price') },
      { status: 503 }
    )
  }
}
