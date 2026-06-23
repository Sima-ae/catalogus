import { NextRequest, NextResponse } from 'next/server'
import { superAdminDenial, verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { parsePriceInput } from '@/lib/price-input'
import { getProductById, updateProduct } from '@/lib/products-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAdminActor(request)
  const denied = superAdminDenial(auth)
  if (denied) return denied

  try {
    const existing = await getProductById(params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const body = (await request.json()) as { price?: unknown }
    const raw = body.price
    const parsed =
      typeof raw === 'number' && Number.isFinite(raw)
        ? Math.round(raw * 100) / 100
        : parsePriceInput(String(raw ?? ''))

    if (parsed == null || parsed < 0) {
      return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 })
    }

    const product = await updateProduct(params.id, { price: parsed })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Admin product sale price PATCH:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to update product price') },
      { status: 503 }
    )
  }
}
