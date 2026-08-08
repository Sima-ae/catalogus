import { NextRequest, NextResponse } from 'next/server'
import {
  DuplicateSkuError,
  getFullShopCatalogProductTotal,
  getProductDashboardStats,
  getShopCatalogProductTotal,
  insertProduct,
  listActiveProductsPaginated,
  listProductsForSellerPaginated,
  listProductsPaginatedAdmin,
  MissingSkuError,
  PublicShareUnavailableError,
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
import {
  parseAdminProductsQuery,
  parseCatalogProductsQuery,
  MAX_ADMIN_PRODUCTS_PAGE_SIZE,
  CATALOG_PAGE_SIZE,
} from '@/lib/catalog-products'
import { omitProductInternalPricing } from '@/lib/product-serialize'
import { resolveStoreModeFromHeaders } from '@/lib/store-host'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const scope = request.nextUrl.searchParams.get('scope')?.trim()
    const access = await resolveCatalogAccess(request)
    const storeMode = resolveStoreModeFromHeaders(request.headers)

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
      const statsOnly = request.nextUrl.searchParams.get('statsOnly') === '1'
      if (statsOnly) {
        const dashboardStats = await getProductDashboardStats()
        return NextResponse.json({
          items: [],
          total: dashboardStats.total,
          page: 1,
          pageSize: 0,
          totalPages: 1,
          dashboardStats,
        })
      }

      const includeStats = request.nextUrl.searchParams.get('includeStats') !== '0'
      const [result, dashboardStats] = await Promise.all([
        listProductsPaginatedAdmin(adminQuery.page, adminQuery.limit, {
          status: adminQuery.status,
          search: adminQuery.search,
          category: adminQuery.category,
          categoryId: adminQuery.categoryId,
          brand: adminQuery.brand,
          filledPricesOnly: adminQuery.filledPricesOnly,
          outOfStockOnly: adminQuery.outOfStockOnly,
          soldOutOnly: adminQuery.soldOutOnly,
          featuredOnly: adminQuery.featuredOnly,
          pricelistOwner: adminQuery.pricelistOwner,
        }),
        includeStats ? getProductDashboardStats() : Promise.resolve(undefined),
      ])
      return NextResponse.json({
        ...result,
        ...(dashboardStats ? { dashboardStats } : {}),
      })
    }

    const paginatedQuery = parseCatalogProductsQuery(request.nextUrl.searchParams)

    if (paginatedQuery) {
      if (storeMode === 'featured') {
        paginatedQuery.featuredOnly = true
        // Keep client/SSR shuffle=1 so the first page can randomize (live RAND).
      }

      // Explicit full-catalog total for 1-1.club CTA modal — never mixes with featured list.
      if (request.nextUrl.searchParams.get('catalogScope') === 'all') {
        const total = await getFullShopCatalogProductTotal()
        return NextResponse.json(
          {
            items: [],
            total,
            fullCatalogTotal: total,
            page: 1,
            pageSize: CATALOG_PAGE_SIZE,
            totalPages: Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE) || 1),
          },
          {
            headers: {
              'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=300',
            },
          }
        )
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

      if (request.nextUrl.searchParams.get('countOnly') === '1') {
        const total = await getShopCatalogProductTotal(paginatedQuery)
        return NextResponse.json(
          {
            items: [],
            total,
            page: paginatedQuery.page,
            pageSize: CATALOG_PAGE_SIZE,
            totalPages: Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE) || 1),
          },
          {
            headers: {
              'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=300',
            },
          }
        )
      }

      // Featured hosts: return featured rows + featured total only — do not COUNT the full catalog.
      const result = await listActiveProductsPaginated(paginatedQuery)
      const liveFeaturedShuffle =
        paginatedQuery.featuredOnly === true &&
        paginatedQuery.shuffle === true &&
        (paginatedQuery.page ?? 1) <= 1
      const cacheControl = liveFeaturedShuffle
        ? 'private, max-age=0, s-maxage=8, stale-while-revalidate=30'
        : paginatedQuery.shuffle
          ? 'public, max-age=15, s-maxage=45, stale-while-revalidate=120'
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
    if (error instanceof PublicShareUnavailableError) {
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
