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
import { parseAdminProductsQuery, parseCatalogProductsQuery, MAX_ADMIN_PRODUCTS_PAGE_SIZE } from '@/lib/catalog-products'
import { omitProductInternalPricing } from '@/lib/product-serialize'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const scope = request.nextUrl.searchParams.get('scope')?.trim()
    const access = await resolveCatalogAccess(request)

    if (scope === 'admin' && access.kind === 'admin') {
      const adminQuery = parseAdminProductsQuery(request.nextUrl.searchParams)
      if (!adminQuery) {
        return NextResponse.json(
          {
            error: `Pagination required. Use ?page=1&limit=${MAX_ADMIN_PRODUCTS_PAGE_SIZE} with scope=admin.`,
          },
          { status: 400 }
        )
      }
      const [result, dashboardStats] = await Promise.all([
        listProductsPaginatedAdmin(adminQuery.page, adminQuery.limit, {
          status: adminQuery.status,
          search: adminQuery.search,
          category: adminQuery.category,
          categoryId: adminQuery.categoryId,
          brand: adminQuery.brand,
          filledPricesOnly: adminQuery.filledPricesOnly,
          pricelistOwner: adminQuery.pricelistOwner,
        }),
        getProductDashboardStats(),
      ])
      return NextResponse.json({ ...result, dashboardStats })
    }

    const paginatedQuery = parseCatalogProductsQuery(request.nextUrl.searchParams)

    if (paginatedQuery) {
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
      const cacheControl = paginatedQuery.shuffle
        ? 'private, no-store'
        : 'public, max-age=60, s-maxage=120, stale-while-revalidate=300'
      return NextResponse.json(result, {
        headers: {
          'Cache-Control': cacheControl,
        },
      })
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
    if (!product) {
      return NextResponse.json({ error: 'Failed to create product' }, { status: 503 })
    }
    return NextResponse.json(
      auth.access.kind === 'admin' ? product : omitProductInternalPricing(product),
      { status: 201 }
    )
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
