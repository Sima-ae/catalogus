import { NextRequest, NextResponse } from 'next/server'
import {
  deleteProductById,
  DuplicateSkuError,
  getProductById,
  MissingSkuError,
  UnknownCategoryError,
  updateProduct,
} from '@/lib/products-db'
import { parseProductBody } from '@/lib/product-body'
import { getDbErrorMessage } from '@/lib/db-errors'
import {
  applySellerProductInput,
  type ProductOwnershipRow,
  requireProductWrite,
  resolveCatalogAccess,
  sellerOwnsProductOrForbidden,
} from '@/lib/product-api-auth'

function ownershipOf(product: Record<string, unknown>): ProductOwnershipRow {
  return {
    author_id: product.author_id != null ? String(product.author_id) : undefined,
    author: product.author != null ? String(product.author) : undefined,
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await getProductById(params.id)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const access = await resolveCatalogAccess(request)
    if (access.kind === 'seller') {
      const allowed = sellerOwnsProductOrForbidden(access, ownershipOf(product))
      if (!allowed.ok) {
        return NextResponse.json({ error: allowed.error }, { status: allowed.status })
      }
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
  const auth = await requireProductWrite(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const existing = await getProductById(params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (auth.access.kind === 'seller') {
      const allowed = sellerOwnsProductOrForbidden(auth.access, ownershipOf(existing))
      if (!allowed.ok) {
        return NextResponse.json({ error: allowed.error }, { status: allowed.status })
      }
    }

    const body = await request.json()
    let input = parseProductBody(body as Record<string, unknown>)
    if (auth.access.kind === 'seller') {
      input = applySellerProductInput(input, auth.access.actor)
    }

    const product = await updateProduct(params.id, input)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json(product)
  } catch (error) {
    if (error instanceof UnknownCategoryError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof MissingSkuError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof DuplicateSkuError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error('Product update error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to update product') },
      { status: 503 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireProductWrite(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const existing = await getProductById(params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (auth.access.kind === 'seller') {
      const allowed = sellerOwnsProductOrForbidden(auth.access, ownershipOf(existing))
      if (!allowed.ok) {
        return NextResponse.json({ error: allowed.error }, { status: allowed.status })
      }
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
