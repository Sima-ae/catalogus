import { NextRequest, NextResponse } from 'next/server'
import { verifyCatalogActor, starTargetOwnerForActor } from '@/lib/catalog-user-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { isProductOnPricelist } from '@/lib/pricelist-db'
import { resolveListOwnerId } from '@/lib/pricelist-api'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await verifyCatalogActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const productId = request.nextUrl.searchParams.get('productId')?.trim()
  const ownerParam = request.nextUrl.searchParams.get('owner')

  if (!productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }

  const resolved = ownerParam
    ? await resolveListOwnerId(auth.actor, ownerParam)
    : { ok: true as const, ownerId: starTargetOwnerForActor(auth.actor) }

  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  try {
    const onList = await isProductOnPricelist(resolved.ownerId, productId)
    return NextResponse.json({ onList, ownerId: resolved.ownerId })
  } catch (error) {
    console.error('Pricelist membership GET:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to check pricelist') },
      { status: 503 }
    )
  }
}
