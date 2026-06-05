import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import {
  bulkUpdateProducts,
  type BulkProductPatch,
  type ProductStatusValue,
  UnknownBrandError,
  UnknownCategoryError,
} from '@/lib/products-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_STATUSES: ProductStatusValue[] = ['active', 'draft', 'inactive', 'trash']

function parseOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = (await request.json()) as {
      productIds?: unknown
      category?: unknown
      brand?: unknown
      price?: unknown
      original_price?: unknown
      status?: unknown
    }

    const productIds = Array.isArray(body.productIds)
      ? body.productIds.map(String).filter(Boolean)
      : []

    if (!productIds.length) {
      return NextResponse.json({ error: 'productIds array is required' }, { status: 400 })
    }

    const patch: BulkProductPatch = {}

    if (body.category !== undefined && body.category !== null && body.category !== '') {
      patch.category = String(body.category).trim()
      if (!patch.category) {
        return NextResponse.json({ error: 'category cannot be empty' }, { status: 400 })
      }
    }

    if (body.brand !== undefined) {
      patch.brand =
        body.brand === null || body.brand === ''
          ? null
          : String(body.brand).trim() || null
    }

    if (body.price !== undefined) {
      const price = parseOptionalNumber(body.price)
      if (price === undefined || price === null || price < 0) {
        return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 })
      }
      patch.price = price
    }

    if (body.original_price !== undefined) {
      const original = parseOptionalNumber(body.original_price)
      if (original !== undefined && original !== null && original < 0) {
        return NextResponse.json(
          { error: 'original_price must be a non-negative number or empty' },
          { status: 400 }
        )
      }
      patch.original_price = original ?? null
    }

    if (body.status !== undefined && body.status !== null && body.status !== '') {
      const status = String(body.status).trim() as ProductStatusValue
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: 'status must be active, draft, inactive, or trash' },
          { status: 400 }
        )
      }
      patch.status = status
    }

    if (
      patch.category === undefined &&
      patch.brand === undefined &&
      patch.price === undefined &&
      patch.original_price === undefined &&
      patch.status === undefined
    ) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const result = await bulkUpdateProducts(productIds, patch)
    return NextResponse.json({ ...result, patch })
  } catch (error) {
    if (error instanceof UnknownCategoryError || error instanceof UnknownBrandError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Bulk product update error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to update products') },
      { status: 503 }
    )
  }
}
