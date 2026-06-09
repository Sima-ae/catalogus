import { NextRequest, NextResponse } from 'next/server'
import { queryDb } from '@/lib/db'
import { getDbErrorMessage } from '@/lib/db-errors'
import {
  PRICELIST_MAX_SELECTION_IDS,
  isPlatformPricelistOwner,
} from '@/lib/pricelist-constants'
import {
  parseUnitPrice,
  setSellerProductStockStatus,
  syncProductPurchasePriceFromPlatformPricelist,
  syncProductShippingCostFromPlatformPricelist,
  upsertSellerProductPrice,
  upsertSellerProductShippingCost,
  listPricelistProductIds,
} from '@/lib/pricelist-db'
import {
  isPricelistStockStatus,
  type PricelistStockStatus,
} from '@/lib/pricelist-stock-status'
import {
  applyPricelistContributorCookie,
  requirePricelistAccess,
  resolvePricelistPriceActor,
} from '@/lib/pricelist-api'
import { readPricelistContributorId } from '@/lib/pricelist-access-cookie'
import {
  assertSellerMayUpdatePrice,
  assertSellerMayUpdateShipping,
  lockSellerPriceAfterSave,
  clearPendingEditRequestsForPrice,
} from '@/lib/seller-price-edit-db'
import {
  buildPricelistFiltersFromClient,
  type PricelistClientFilterInput,
} from '@/lib/pricelist-api-query'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const INTERNAL_BATCH_SIZE = 500

type BulkItem = { productId: string; sellerId?: string }

type BulkAccess = Extract<Awaited<ReturnType<typeof requirePricelistAccess>>, { ok: true }>

type BulkPriceActor = Extract<
  Awaited<ReturnType<typeof resolvePricelistPriceActor>>,
  { ok: true }
>

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

function parseApplyToFilters(raw: unknown): PricelistClientFilterInput | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  return {
    search: row.search != null ? String(row.search) : undefined,
    category: row.category != null ? String(row.category) : undefined,
    subcategory: row.subcategory != null ? String(row.subcategory) : undefined,
    brand: row.brand != null ? String(row.brand) : undefined,
    missingPricesOnly:
      row.missingPricesOnly === false || row.missingPricesOnly === 'false'
        ? false
        : row.missingPricesOnly === true || row.missingPricesOnly === 'true'
          ? true
          : undefined,
  }
}

function viewerFromAccess(request: NextRequest, access: BulkAccess) {
  if (access.mode === 'guest') {
    const contributorId = readPricelistContributorId(request.headers.get('cookie')) ?? ''
    return { userId: contributorId, role: 'guest' as const }
  }
  if (!access.actor) return null
  return {
    userId: access.actor.userId,
    role: access.actor.role,
    isSuperAdmin: access.actor.isSuperAdmin,
  }
}

async function resolveBulkItemList(
  request: NextRequest,
  access: BulkAccess,
  explicitItems: BulkItem[],
  applyToFilters: PricelistClientFilterInput | null
): Promise<BulkItem[]> {
  if (applyToFilters) {
    const viewer = viewerFromAccess(request, access)
    if (!viewer) return []
    const filters = await buildPricelistFiltersFromClient(applyToFilters)
    const productIds = await listPricelistProductIds(
      access.ownerId,
      viewer,
      filters,
      PRICELIST_MAX_SELECTION_IDS
    )
    return productIds.map((productId) => ({ productId }))
  }
  return explicitItems
}

async function processBulkItems(
  items: BulkItem[],
  opts: {
    action: 'stockStatus' | 'price' | 'shipping'
    stockStatus: PricelistStockStatus | null
    unitPrice: number | null
    shippingCost: number | null
    access: BulkAccess
    priceActor: BulkPriceActor
    currency: string
  }
): Promise<{ updated: number; skipped: number; failed: number; errors: string[] }> {
  const { action, stockStatus, unitPrice, shippingCost, access, priceActor, currency } = opts

  const actorSellerId =
    priceActor.actor.kind === 'guest'
      ? priceActor.actor.contributorId
      : priceActor.actor.userId

  const isSellerActor = access.mode === 'full' && access.actor?.role === 'seller'
  const isAdminActor = access.mode === 'full' && access.actor?.role === 'admin'
  const updatedBy =
    access.mode === 'full' && access.actor ? access.actor.userId : actorSellerId

  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (let offset = 0; offset < items.length; offset += INTERNAL_BATCH_SIZE) {
    const batch = items.slice(offset, offset + INTERNAL_BATCH_SIZE)
    for (const item of batch) {
      const targetSellerId =
        isAdminActor && item.sellerId ? item.sellerId : actorSellerId

      if (isSellerActor) {
        const mayUpdate =
          action === 'shipping'
            ? await assertSellerMayUpdateShipping(targetSellerId, item.productId)
            : await assertSellerMayUpdatePrice(targetSellerId, item.productId)
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
        } else if (action === 'shipping' && shippingCost !== null) {
          await upsertSellerProductShippingCost({
            sellerId: targetSellerId,
            productId: item.productId,
            shippingCost,
            currency,
            updatedBy,
          })
          if (isPlatformPricelistOwner(access.ownerId)) {
            await syncProductShippingCostFromPlatformPricelist(item.productId)
          }
        }

        if (isSellerActor && action === 'price') {
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
  }

  return { updated, skipped, failed: errors.length, errors }
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
  const shippingCost = parseUnitPrice(raw.shippingCost)
  const explicitItems = parseBulkItems(raw.items)
  const applyToFilters = parseApplyToFilters(raw.applyToFilters)

  if (!explicitItems.length && !applyToFilters) {
    return NextResponse.json(
      { error: 'items or applyToFilters is required' },
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
  } else if (action === 'shipping') {
    if (shippingCost === null) {
      return NextResponse.json({ error: 'Valid shipping cost is required' }, { status: 400 })
    }
  } else {
    return NextResponse.json(
      { error: 'action must be stockStatus, price, or shipping' },
      { status: 400 }
    )
  }

  const access = await requirePricelistAccess(request, ownerParam || null, { allowGuest: true })
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const priceActor = await resolvePricelistPriceActor(request, access)
  if (!priceActor.ok) {
    return NextResponse.json({ error: priceActor.error }, { status: priceActor.status })
  }

  try {
    const items = await resolveBulkItemList(request, access, explicitItems, applyToFilters)
    if (!items.length) {
      return NextResponse.json({ error: 'No matching products to update' }, { status: 400 })
    }
    if (items.length > PRICELIST_MAX_SELECTION_IDS) {
      return NextResponse.json(
        { error: `Bulk limit is ${PRICELIST_MAX_SELECTION_IDS} products` },
        { status: 400 }
      )
    }

    const currency = await getShopCurrency()
    const result = await processBulkItems(items, {
      action: action as 'stockStatus' | 'price' | 'shipping',
      stockStatus,
      unitPrice,
      shippingCost,
      access,
      priceActor,
      currency,
    })

    const res = NextResponse.json({
      ok: true,
      total: items.length,
      ...result,
      errors: result.errors.slice(0, 10),
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
