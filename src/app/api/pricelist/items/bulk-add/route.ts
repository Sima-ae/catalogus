import { NextRequest, NextResponse } from 'next/server'
import { getDbErrorMessage } from '@/lib/db-errors'
import {
  starTargetOwnerForActor,
  verifyCatalogActor,
} from '@/lib/catalog-user-auth'
import { bulkAddPricelistItems } from '@/lib/pricelist-db'
import { assertManageItems, requirePricelistAccess } from '@/lib/pricelist-api'
import { listActiveProductIdsForCatalogQuery } from '@/lib/products-db'
import { PRICELIST_OWNER_QUERY_PLATFORM } from '@/lib/pricelist-constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type BulkScope = 'category' | 'brand'

export async function POST(request: NextRequest) {
  const auth = await verifyCatalogActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  if (auth.actor.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const scope = String(raw.scope ?? '').trim() as BulkScope
  const ownerParam = String(raw.ownerId ?? PRICELIST_OWNER_QUERY_PLATFORM).trim()
  const category = String(raw.category ?? '').trim() || undefined
  const subcategory = String(raw.subcategory ?? '').trim() || undefined
  const brand = String(raw.brand ?? '').trim() || undefined

  if (scope !== 'category' && scope !== 'brand') {
    return NextResponse.json({ error: 'scope must be category or brand' }, { status: 400 })
  }

  if (scope === 'category' && (!category || category === 'All')) {
    return NextResponse.json({ error: 'category is required' }, { status: 400 })
  }

  if (scope === 'brand' && (!brand || brand === 'All')) {
    return NextResponse.json({ error: 'brand is required' }, { status: 400 })
  }

  const access = await requirePricelistAccess(request, ownerParam || null)
  if (!access.ok || !access.actor) {
    return NextResponse.json(
      { error: access.ok ? 'Sign in required' : access.error },
      { status: access.ok ? 401 : access.status }
    )
  }

  const ownerId = access.ownerId
  const manage = await assertManageItems(auth.actor, ownerId)
  if (!manage.ok) {
    return NextResponse.json({ error: manage.error }, { status: manage.status })
  }

  try {
    const productIds = await listActiveProductIdsForCatalogQuery({
      category: category && category !== 'All' ? category : undefined,
      subcategory: subcategory && subcategory !== 'All' ? subcategory : undefined,
      brand: scope === 'brand' ? brand : undefined,
    })

    if (!productIds.length) {
      return NextResponse.json({
        ok: true,
        inserted: 0,
        skipped: 0,
        total: 0,
        matched: 0,
      })
    }

    const result = await bulkAddPricelistItems({
      ownerUserId: ownerId,
      productIds,
      addedByUserId: auth.actor.userId,
    })

    return NextResponse.json({
      ok: true,
      matched: productIds.length,
      ...result,
    })
  } catch (error) {
    console.error('Pricelist items bulk-add POST:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to add products to pricelist') },
      { status: 503 }
    )
  }
}
