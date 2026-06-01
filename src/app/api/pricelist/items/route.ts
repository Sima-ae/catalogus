import { NextRequest, NextResponse } from 'next/server'
import { verifyCatalogActor, starTargetOwnerForActor } from '@/lib/catalog-user-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { addPricelistItem, listPricelistRows, removePricelistItem } from '@/lib/pricelist-db'
import { assertManageItems, resolveListOwnerId } from '@/lib/pricelist-api'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await verifyCatalogActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const ownerParam = request.nextUrl.searchParams.get('owner')
  const resolved = await resolveListOwnerId(auth.actor, ownerParam)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  try {
    const items = await listPricelistRows(resolved.ownerId, {
      userId: auth.actor.userId,
      role: auth.actor.role,
    })
    return NextResponse.json({ ownerId: resolved.ownerId, items })
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

  const resolved = ownerParam
    ? await resolveListOwnerId(auth.actor, ownerParam)
    : { ok: true as const, ownerId: starTargetOwnerForActor(auth.actor) }

  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const manage = await assertManageItems(auth.actor, resolved.ownerId)
  if (!manage.ok) {
    return NextResponse.json({ error: manage.error }, { status: manage.status })
  }

  try {
    await addPricelistItem({
      ownerUserId: resolved.ownerId,
      productId,
      addedByUserId: auth.actor.userId,
    })
    return NextResponse.json({ ok: true, ownerId: resolved.ownerId }, { status: 201 })
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

  const resolved = await resolveListOwnerId(auth.actor, ownerParam)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const manage = await assertManageItems(auth.actor, resolved.ownerId)
  if (!manage.ok) {
    return NextResponse.json({ error: manage.error }, { status: manage.status })
  }

  try {
    await removePricelistItem(resolved.ownerId, productId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Pricelist items DELETE:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to remove from pricelist') },
      { status: 503 }
    )
  }
}
