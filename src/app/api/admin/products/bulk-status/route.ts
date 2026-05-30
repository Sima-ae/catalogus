import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { bulkUpdateProductStatus, type ProductStatusValue } from '@/lib/products-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_STATUSES: ProductStatusValue[] = ['active', 'draft', 'inactive']

export async function POST(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = (await request.json()) as { productIds?: unknown; status?: unknown }
    const productIds = Array.isArray(body.productIds)
      ? body.productIds.map(String).filter(Boolean)
      : []
    const status = String(body.status || '').trim() as ProductStatusValue

    if (!productIds.length) {
      return NextResponse.json({ error: 'productIds array is required' }, { status: 400 })
    }
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'status must be active, draft, or inactive' },
        { status: 400 }
      )
    }

    const updated = await bulkUpdateProductStatus(productIds, status)
    return NextResponse.json({ updated, status })
  } catch (error) {
    console.error('Bulk product status error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to update products') },
      { status: 503 }
    )
  }
}
