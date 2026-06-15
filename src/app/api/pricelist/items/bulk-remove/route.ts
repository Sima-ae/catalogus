import { NextRequest, NextResponse } from 'next/server'
import { getDbErrorMessage } from '@/lib/db-errors'
import {
  PRICELIST_MAX_SELECTION_IDS,
} from '@/lib/pricelist-constants'
import {
  bulkRemovePricelistItems,
  listPricelistProductIds,
} from '@/lib/pricelist-db'
import { assertManageItems, requirePricelistAccess } from '@/lib/pricelist-api'
import {
  buildPricelistFiltersFromClient,
  parsePricelistClientFilterInput,
  restrictAdminOnlyPricelistFilters,
} from '@/lib/pricelist-api-query'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type BulkItem = { productId: string }

function parseBulkItems(raw: unknown): BulkItem[] {
  if (!Array.isArray(raw)) return []
  const items: BulkItem[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    const productId = String(row.productId ?? '').trim()
    if (!productId) continue
    items.push({ productId })
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
  const explicitItems = parseBulkItems(raw.items)
  const applyToFilters = parsePricelistClientFilterInput(raw.applyToFilters)

  if (!explicitItems.length && !applyToFilters) {
    return NextResponse.json(
      { error: 'items or applyToFilters is required' },
      { status: 400 }
    )
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

  const viewer = {
    userId: access.actor.userId,
    role: access.actor.role,
    isSuperAdmin: access.actor.isSuperAdmin,
  }

  try {
    let productIds: string[]
    if (applyToFilters) {
      const filters = restrictAdminOnlyPricelistFilters(
        await buildPricelistFiltersFromClient(applyToFilters),
        viewer
      )
      productIds = await listPricelistProductIds(
        access.ownerId,
        viewer,
        filters,
        PRICELIST_MAX_SELECTION_IDS
      )
    } else {
      productIds = explicitItems.map((item) => item.productId)
    }

    if (!productIds.length) {
      return NextResponse.json({ error: 'No matching products to remove' }, { status: 400 })
    }
    if (productIds.length > PRICELIST_MAX_SELECTION_IDS) {
      return NextResponse.json(
        { error: `Bulk limit is ${PRICELIST_MAX_SELECTION_IDS} products` },
        { status: 400 }
      )
    }

    const result = await bulkRemovePricelistItems(access.ownerId, productIds)

    return NextResponse.json({
      ok: true,
      total: productIds.length,
      ...result,
      errors: result.errors.slice(0, 10),
    })
  } catch (error) {
    console.error('Pricelist items bulk-remove POST:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Bulk remove failed') },
      { status: 503 }
    )
  }
}
