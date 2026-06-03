import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { bulkMoveProductsToTrash } from '@/lib/products-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = (await request.json()) as { productIds?: unknown }
    const productIds = Array.isArray(body.productIds)
      ? body.productIds.map(String).filter(Boolean)
      : []

    if (!productIds.length) {
      return NextResponse.json({ error: 'productIds array is required' }, { status: 400 })
    }

    const moved = await bulkMoveProductsToTrash(productIds)
    return NextResponse.json({ moved, deleted: moved })
  } catch (error) {
    console.error('Bulk product delete error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to delete products') },
      { status: 503 }
    )
  }
}
