import { NextRequest, NextResponse } from 'next/server'
import {
  deleteDevProduct,
  devModeEnabled,
  getDevProduct,
  updateDevProduct,
} from '@/lib/dev-store'
import { deleteProductById, getProductById, updateProduct } from '@/lib/products-db'
import { isDevDataFallbackEnabled } from '@/lib/dev-seed'

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
    if (isDevDataFallbackEnabled()) {
      const product = getDevProduct(params.id)
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }
      return NextResponse.json(product)
    }
    return NextResponse.json({ error: 'Failed to load product' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    try {
      const product = await updateProduct(params.id, body)
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }
      return NextResponse.json(product)
    } catch (dbError) {
      if (devModeEnabled()) {
        const product = updateDevProduct(params.id, body)
        if (!product) {
          return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }
        return NextResponse.json(product)
      }
      throw dbError
    }
  } catch (error) {
    console.error('Product update error:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    try {
      await deleteProductById(params.id)
      return NextResponse.json({ ok: true })
    } catch (dbError) {
      if (devModeEnabled()) {
        const ok = deleteDevProduct(params.id)
        if (!ok) {
          return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }
        return NextResponse.json({ ok: true })
      }
      throw dbError
    }
  } catch (error) {
    console.error('Product delete error:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
