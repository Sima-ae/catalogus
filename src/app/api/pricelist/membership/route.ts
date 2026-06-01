import { NextRequest, NextResponse } from 'next/server'
import { starTargetOwnerForActor, verifyCatalogActor } from '@/lib/catalog-user-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { isProductOnPricelist } from '@/lib/pricelist-db'
import { requirePricelistAccess } from '@/lib/pricelist-api'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await verifyCatalogActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, onList: false }, { status: auth.status })
  }

  const productId = request.nextUrl.searchParams.get('productId')?.trim()
  const ownerParam = request.nextUrl.searchParams.get('owner')

  if (!productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }

  const access = await requirePricelistAccess(request, ownerParam || null)
  if (!access.ok || access.mode === 'guest') {
    const ownerId = starTargetOwnerForActor(auth.actor)
    try {
      const onList = await isProductOnPricelist(ownerId, productId)
      return NextResponse.json({ onList, ownerId })
    } catch {
      return NextResponse.json({ onList: false })
    }
  }

  try {
    const onList = await isProductOnPricelist(access.ownerId, productId)
    return NextResponse.json({ onList, ownerId: access.ownerId })
  } catch (error) {
    console.error('Pricelist membership GET:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to check pricelist') },
      { status: 503 }
    )
  }
}
