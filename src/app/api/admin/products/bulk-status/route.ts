import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import {
  bulkUpdateProductStatus,
  bulkUpdateProductStatusByFilter,
  type ProductStatusValue,
} from '@/lib/products-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_STATUSES: ProductStatusValue[] = ['active', 'draft', 'inactive']

export async function POST(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = (await request.json()) as {
      productIds?: unknown
      status?: unknown
      fromStatus?: unknown
    }
    const productIds = Array.isArray(body.productIds)
      ? body.productIds.map(String).filter(Boolean)
      : []
    const status = String(body.status || '').trim() as ProductStatusValue
    const fromStatus = String(body.fromStatus || '').trim() as ProductStatusValue

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'status must be active, draft, or inactive' },
        { status: 400 }
      )
    }

    if (fromStatus && VALID_STATUSES.includes(fromStatus)) {
      const updated = await bulkUpdateProductStatusByFilter(fromStatus, status)
      return NextResponse.json({ updated, status })
    }

    if (!productIds.length) {
      return NextResponse.json(
        { error: 'productIds array is required (or pass fromStatus)' },
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
