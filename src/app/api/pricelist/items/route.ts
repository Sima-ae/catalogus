import { NextRequest, NextResponse } from 'next/server'
import { starTargetOwnerForActor, verifyCatalogActor } from '@/lib/catalog-user-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { addPricelistItem, listPricelistRows, removePricelistItem } from '@/lib/pricelist-db'
import { assertManageItems, requirePricelistAccess } from '@/lib/pricelist-api'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function viewerFromAccess(access: Awaited<ReturnType<typeof requirePricelistAccess>>) {
  if (!access.ok) return null
  if (access.mode === 'guest') {
    return { userId: '', role: 'guest' as const }
  }
  if (!access.actor) return null
  return { userId: access.actor.userId, role: access.actor.role }
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

  const viewer = viewerFromAccess(access)
  if (!viewer) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  try {
    const items = await listPricelistRows(access.ownerId, viewer)
    return NextResponse.json({
      ownerId: access.ownerId,
      items,
      mode: access.mode,
    })
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

  const manage = await assertManageItems(auth.actor, access.ownerId)
  if (!manage.ok) {
    return NextResponse.json({ error: manage.error }, { status: manage.status })
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
