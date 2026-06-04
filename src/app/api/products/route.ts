import { NextRequest, NextResponse } from 'next/server'
import {
  DuplicateSkuError,
  getProductDashboardStats,
  insertProduct,
  listActiveProductsPaginated,
  listProductsForSellerPaginated,
  listProductsPaginatedAdmin,
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
import { parseAdminProductsQuery, parseCatalogProductsQuery } from '@/lib/catalog-products'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const paginatedQuery = parseCatalogProductsQuery(request.nextUrl.searchParams)

    if (paginatedQuery) {
      const scope = request.nextUrl.searchParams.get('scope')?.trim()
      const access = await resolveCatalogAccess(request)

      if (scope === 'admin' && access.kind === 'admin') {
        const adminQuery = parseAdminProductsQuery(request.nextUrl.searchParams)
        const [result, dashboardStats] = await Promise.all([
          listProductsPaginatedAdmin(
            paginatedQuery.page,
            paginatedQuery.limit,
            {
              status: adminQuery?.status,
              search: adminQuery?.search,
            }
          ),
          getProductDashboardStats(),
        ])
        return NextResponse.json({ ...result, dashboardStats })
      }

      if (access.kind === 'seller') {
        const result = await listProductsForSellerPaginated(
          access.actor.userId,
          access.actor.name,
          paginatedQuery.page,
          paginatedQuery.limit
        )
        return NextResponse.json(result)
      }

      const result = await listActiveProductsPaginated(paginatedQuery)
      return NextResponse.json(result)
    }

    return NextResponse.json(
      { error: 'Pagination required. Use ?page=1&limit=60 (add scope=admin for admin lists).' },
      { status: 400 }
    )
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
