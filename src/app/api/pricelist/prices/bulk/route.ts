import { NextRequest, NextResponse } from 'next/server'
import { queryDb } from '@/lib/db'
import { getDbErrorMessage } from '@/lib/db-errors'
import { isPlatformPricelistOwner } from '@/lib/pricelist-constants'
import {
  parseUnitPrice,
  setSellerProductStockStatus,
  syncProductPurchasePriceFromPlatformPricelist,
  upsertSellerProductPrice,
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

const MAX_BULK_ITEMS = 500

type BulkItem = { productId: string; sellerId?: string }

async function getShopCurrency(): Promise<string> {
  const rows = await queryDb<{ value: string }[]>(
    `SELECT value FROM settings WHERE \`key\` = 'currency' LIMIT 1`
  )
  return rows[0]?.value?.trim() || 'EUR'
}

function parseBulkItems(raw: unknown): BulkItem[] {
  if (!Array.isArray(raw)) return []
  const items: BulkItem[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    const productId = String(row.productId ?? '').trim()
    if (!productId) continue
    const sellerId = String(row.sellerId ?? '').trim()
    items.push(sellerId ? { productId, sellerId } : { productId })
  }
  return items
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const ownerParam = String(raw.ownerId ?? '').trim()
  const action = String(raw.action ?? '').trim()
  const stockStatusRaw = String(raw.stockStatus ?? '').trim()
  const stockStatus = isPricelistStockStatus(stockStatusRaw) ? stockStatusRaw : null
  const unitPrice = parseUnitPrice(raw.unitPrice)
  const items = parseBulkItems(raw.items)

  if (!items.length) {
    return NextResponse.json({ error: 'At least one product is required' }, { status: 400 })
  }
  if (items.length > MAX_BULK_ITEMS) {
    return NextResponse.json(
      { error: `Bulk limit is ${MAX_BULK_ITEMS} products per request` },
      { status: 400 }
    )
  }

  if (action === 'stockStatus') {
    if (!stockStatus) {
      return NextResponse.json({ error: 'Valid stockStatus is required' }, { status: 400 })
    }
  } else if (action === 'price') {
    if (unitPrice === null) {
      return NextResponse.json({ error: 'Valid unit price is required' }, { status: 400 })
    }
  } else {
    return NextResponse.json({ error: 'action must be stockStatus or price' }, { status: 400 })
  }

  const access = await requirePricelistAccess(request, ownerParam || null, { allowGuest: true })
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const priceActor = await resolvePricelistPriceActor(request, access)
  if (!priceActor.ok) {
    return NextResponse.json({ error: priceActor.error }, { status: priceActor.status })
  }

  const actorSellerId =
    priceActor.actor.kind === 'guest'
      ? priceActor.actor.contributorId
      : priceActor.actor.userId

  const isSellerActor = access.mode === 'full' && access.actor?.role === 'seller'
  const isAdminActor = access.mode === 'full' && access.actor?.role === 'admin'
  const updatedBy =
    access.mode === 'full' && access.actor ? access.actor.userId : actorSellerId

  try {
    const currency = await getShopCurrency()
    let updated = 0
    let skipped = 0
    const errors: string[] = []

    for (const item of items) {
      const targetSellerId =
        isAdminActor && item.sellerId ? item.sellerId : actorSellerId

      if (isSellerActor) {
        const mayUpdate = await assertSellerMayUpdatePrice(targetSellerId, item.productId)
        if (!mayUpdate.ok) {
          skipped += 1
          continue
        }
      }

      try {
        if (action === 'stockStatus' && stockStatus) {
          await setSellerProductStockStatus({
            sellerId: targetSellerId,
            productId: item.productId,
            stockStatus,
            currency,
            updatedBy,
            syncProductSoldOut: isPlatformPricelistOwner(access.ownerId),
          })
        } else if (action === 'price' && unitPrice !== null) {
          await upsertSellerProductPrice({
            sellerId: targetSellerId,
            productId: item.productId,
            unitPrice,
            currency,
            updatedBy,
          })
          if (isPlatformPricelistOwner(access.ownerId)) {
            await syncProductPurchasePriceFromPlatformPricelist(item.productId)
          }
        }

        if (isSellerActor) {
          await lockSellerPriceAfterSave(targetSellerId, item.productId)
        }
        if (isAdminActor && item.sellerId && item.sellerId !== access.actor!.userId) {
          await clearPendingEditRequestsForPrice(item.sellerId, item.productId)
        }
        updated += 1
      } catch (itemError) {
        errors.push(
          `${item.productId}: ${itemError instanceof Error ? itemError.message : 'Failed'}`
        )
      }
    }

    const res = NextResponse.json({
      ok: true,
      updated,
      skipped,
      failed: errors.length,
      errors: errors.slice(0, 10),
    })
    if (priceActor.actor.kind === 'guest') {
      applyPricelistContributorCookie(res, priceActor.actor.setContributorCookie)
    }
    return res
  } catch (error) {
    console.error('Pricelist prices bulk POST:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Bulk update failed') },
      { status: 503 }
    )
  }
}
