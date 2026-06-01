import { NextRequest, NextResponse } from 'next/server'
import { verifyCatalogActor } from '@/lib/catalog-user-auth'
import { canManagePricelistItems } from '@/lib/catalog-user-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { parsePricelistOwnerParam, isPlatformPricelistOwner } from '@/lib/pricelist-constants'
import { starTargetOwnerForActor } from '@/lib/catalog-user-auth'
import { setPricelistSharePassword, getPricelistShareSettings } from '@/lib/pricelist-share-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await verifyCatalogActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const ownerParam = request.nextUrl.searchParams.get('owner')
  const listOwnerId = ownerParam
    ? parsePricelistOwnerParam(ownerParam) ?? starTargetOwnerForActor(auth.actor)
    : starTargetOwnerForActor(auth.actor)

  if (!(await canManagePricelistItems(auth.actor, listOwnerId))) {
    return NextResponse.json({ error: 'You cannot manage this pricelist' }, { status: 403 })
  }

  try {
    const settings = await getPricelistShareSettings(listOwnerId)
    return NextResponse.json({
      ownerId: listOwnerId,
      hasPassword: settings.has_password,
      isPlatform: isPlatformPricelistOwner(listOwnerId),
    })
  } catch (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load settings') },
      { status: 503 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const auth = await verifyCatalogActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const ownerParam = String(raw.ownerId ?? raw.owner ?? '').trim()
  const listOwnerId = ownerParam
    ? parsePricelistOwnerParam(ownerParam) ?? starTargetOwnerForActor(auth.actor)
    : starTargetOwnerForActor(auth.actor)

  if (!(await canManagePricelistItems(auth.actor, listOwnerId))) {
    return NextResponse.json({ error: 'You cannot manage this pricelist' }, { status: 403 })
  }

  const clear = raw.clear === true || raw.password === null
  const passwordStr = String(raw.password ?? '')

  if (!clear && passwordStr.length < 4) {
    return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 })
  }

  try {
    const settings = await setPricelistSharePassword(listOwnerId, clear ? null : passwordStr)
    return NextResponse.json({
      ok: true,
      hasPassword: settings.has_password,
      ownerId: listOwnerId,
    })
  } catch (error) {
    console.error('Pricelist password PUT:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to save password') },
      { status: 503 }
    )
  }
}
