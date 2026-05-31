import { NextRequest, NextResponse } from 'next/server'
import {
  DuplicateSkuError,
  getProductDashboardStats,
  insertProduct,
  listActiveProducts,
  listActiveProductsPaginated,
  listProducts,
  listProductsForSeller,
  listProductsPaginated,
  MissingSkuError,
  UnknownBrandError,
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
import { parseCatalogProductsQuery } from '@/lib/catalog-products'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const paginatedQuery = parseCatalogProductsQuery(request.nextUrl.searchParams)

    if (paginatedQuery) {
      const scope = request.nextUrl.searchParams.get('scope')?.trim()
      const access = await resolveCatalogAccess(request)

      if (scope === 'admin' && access.kind === 'admin') {
        const [result, dashboardStats] = await Promise.all([
          listProductsPaginated(paginatedQuery.page, paginatedQuery.limit),
          getProductDashboardStats(),
        ])
        return NextResponse.json({ ...result, dashboardStats })
      }

      if (access.kind === 'seller') {
        const all = await listProductsForSeller(access.actor.userId, access.actor.name)
        const start = (paginatedQuery.page - 1) * paginatedQuery.limit
        const items = all.slice(start, start + paginatedQuery.limit)
        return NextResponse.json({
          items,
          total: all.length,
          page: paginatedQuery.page,
          pageSize: paginatedQuery.limit,
          totalPages: Math.max(1, Math.ceil(all.length / paginatedQuery.limit) || 1),
        })
      }

      const result = await listActiveProductsPaginated(paginatedQuery)
      return NextResponse.json(result)
    }

    const access = await resolveCatalogAccess(request)
    const rows =
      access.kind === 'seller'
        ? await listProductsForSeller(access.actor.userId, access.actor.name)
        : access.kind === 'admin'
          ? await listProducts()
          : await listActiveProducts()
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
    if (!input.sku?.trim()) {
      return NextResponse.json({ error: 'SKU is required' }, { status: 400 })
    }

    const product = await insertProduct(input)
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    if (error instanceof UnknownCategoryError || error instanceof UnknownBrandError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof MissingSkuError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof DuplicateSkuError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error('Product create error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to create product') },
      { status: 503 }
    )
  }
}
