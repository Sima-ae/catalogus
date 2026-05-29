import { NextRequest, NextResponse } from 'next/server'
import {
  insertProduct,
  listProducts,
  listProductsForSeller,
  UnknownCategoryError,
} from '@/lib/products-db'
import { parseProductBody } from '@/lib/product-body'
import { getDbErrorMessage } from '@/lib/db-errors'
import { logDbRouteError } from '@/lib/db-route-log'
import {
  applySellerProductInput,
  requireProductWrite,
  resolveCatalogAccess,
} from '@/lib/product-api-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const access = await resolveCatalogAccess(request)
    const rows =
      access.kind === 'seller'
        ? await listProductsForSeller(access.actor.userId, access.actor.name)
        : await listProducts()
    return NextResponse.json(rows)
  } catch (error) {
    logDbRouteError('Products fetch error', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load products') },
      { status: 503 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireProductWrite(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    let input = parseProductBody(body as Record<string, unknown>)
    if (auth.access.kind === 'seller') {
      input = applySellerProductInput(input, auth.access.actor)
    }

    if (!input.name || !input.short_description || !input.image_url || !input.category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const product = await insertProduct(input)
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    if (error instanceof UnknownCategoryError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Product create error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to create product') },
      { status: 503 }
    )
  }
}
