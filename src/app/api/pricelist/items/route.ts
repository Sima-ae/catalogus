import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getDbErrorMessage } from '@/lib/db-errors'
import { starTargetOwnerForActor, verifyCatalogActor } from '@/lib/catalog-user-auth'
import { parsePricelistItemsQuery } from '@/lib/pricelist-api-query'
import { PRICELIST_MAX_SELECTION_IDS } from '@/lib/pricelist-constants'
import {
  addPricelistItem,
  listPricelistPage,
  listPricelistProductIds,
  listPricelistRowsForExport,
  removePricelistItem,
} from '@/lib/pricelist-db'
import { assertManageItems, requirePricelistAccess } from '@/lib/pricelist-api'
import {
  readPricelistContributorId,
  getPricelistContributorCookieOptions,
  PRICELIST_CONTRIBUTOR_COOKIE,
} from '@/lib/pricelist-access-cookie'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function viewerFromAccess(
  request: NextRequest,
  access: Extract<Awaited<ReturnType<typeof requirePricelistAccess>>, { ok: true }>
) {
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

function ensureGuestContributorCookie(
  request: NextRequest,
  response: NextResponse,
  access: Extract<Awaited<ReturnType<typeof requirePricelistAccess>>, { ok: true }>
): void {
  if (access.mode !== 'guest') return
  if (readPricelistContributorId(request.headers.get('cookie'))) return
  response.cookies.set(
    PRICELIST_CONTRIBUTOR_COOKIE,
    randomUUID(),
    getPricelistContributorCookieOptions()
  )
}

export async function GET(request: NextRequest) {
  const ownerParam = request.nextUrl.searchParams.get('owner')
  const access = await requirePricelistAccess(request, ownerParam, { allowGuest: true })
  if (!access.ok) {
    return NextResponse.json(
      {
        error: access.error,
        requiresLogin: access.requiresLogin,
        requiresPassword: access.requiresPassword,
        ownerId: access.ownerId,
      },
      { status: access.status }
    )
  }

  const viewer = viewerFromAccess(request, access)
  if (!viewer) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  try {
    const parsed = await parsePricelistItemsQuery(request.nextUrl.searchParams)

    if (parsed.idsOnly) {
      const productIds = await listPricelistProductIds(
        access.ownerId,
        viewer,
        parsed.filters,
        PRICELIST_MAX_SELECTION_IDS
      )
      const res = NextResponse.json({
        ownerId: access.ownerId,
        productIds,
        total: productIds.length,
        mode: access.mode,
        idsOnly: true,
      })
      ensureGuestContributorCookie(request, res, access)
      return res
    }

    if (parsed.exportAll) {
      const items = await listPricelistRowsForExport(
        access.ownerId,
        viewer,
        {
          search: parsed.filters.search,
          categoryFilter: parsed.filters.categoryFilter,
          brand: parsed.filters.brand,
        },
        parsed.limit
      )
      const res = NextResponse.json({
        ownerId: access.ownerId,
        items,
        mode: access.mode,
        export: true,
      })
      ensureGuestContributorCookie(request, res, access)
      return res
    }

    const page = await listPricelistPage(access.ownerId, viewer, {
      page: parsed.page,
      limit: parsed.limit,
      filters: parsed.filters,
    })
    const res = NextResponse.json({
      ownerId: access.ownerId,
      items: page.items,
      total: page.total,
      totalOnPricelist: page.totalOnPricelist,
      page: page.page,
      pageSize: page.pageSize,
      totalPages: page.totalPages,
      missingPriceCount: page.missingPriceCount,
      exportFilledCount: page.exportFilledCount,
      outOfStockCount: page.outOfStockCount,
      mode: access.mode,
    })
    ensureGuestContributorCookie(request, res, access)
    return res
  } catch (error) {
    console.error('Pricelist items GET:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load pricelist') },
      { status: 503 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyCatalogActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  const productId = body && typeof body === 'object' ? String((body as Record<string, unknown>).productId ?? '') : ''
  const ownerParam =
    body && typeof body === 'object'
      ? String((body as Record<string, unknown>).ownerId ?? '').trim()
      : ''

  if (!productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }

  const access = await requirePricelistAccess(request, ownerParam || null)
  if (!access.ok || !access.actor) {
    return NextResponse.json(
      { error: access.ok ? 'Sign in required' : access.error },
      { status: access.ok ? 401 : access.status }
    )
  }

  const ownerId = ownerParam ? access.ownerId : starTargetOwnerForActor(auth.actor)

  const manage = await assertManageItems(auth.actor, ownerId)
  if (!manage.ok) {
    return NextResponse.json({ error: manage.error }, { status: manage.status })
  }

  try {
    await addPricelistItem({
      ownerUserId: ownerId,
      productId,
      addedByUserId: auth.actor.userId,
    })
    return NextResponse.json({ ok: true, ownerId }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    if (msg === 'PRODUCT_NOT_FOUND') {
      return NextResponse.json({ error: 'Product not found or inactive' }, { status: 404 })
    }
    console.error('Pricelist items POST:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to add to pricelist') },
      { status: 503 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyCatalogActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const productId = request.nextUrl.searchParams.get('productId')?.trim()
  const ownerParam = request.nextUrl.searchParams.get('owner')

  if (!productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }

  const access = await requirePricelistAccess(request, ownerParam)
  if (!access.ok || !access.actor) {
    return NextResponse.json({ error: access.ok ? 'Sign in required' : access.error }, { status: access.ok ? 401 : access.status })
  }

  if (!access.actor.isSuperAdmin) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
  }

  try {
    await removePricelistItem(access.ownerId, productId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Pricelist items DELETE:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to remove from pricelist') },
      { status: 503 }
    )
  }
}
