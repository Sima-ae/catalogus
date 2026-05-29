import { NextRequest, NextResponse } from 'next/server'
import {
  deleteProductById,
  getProductById,
  UnknownCategoryError,
  updateProduct,
} from '@/lib/products-db'
import { getDbErrorMessage } from '@/lib/db-errors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await getProductById(params.id)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json(product)
  } catch (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load product') },
      { status: 503 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const product = await updateProduct(params.id, body)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json(product)
  } catch (error) {
    if (error instanceof UnknownCategoryError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Product update error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to update product') },
      { status: 503 }
    )
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await getProductById(params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    await deleteProductById(params.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Product delete error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to delete product') },
      { status: 503 }
    )
  }
}
