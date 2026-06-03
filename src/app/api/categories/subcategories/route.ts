import { NextRequest, NextResponse } from 'next/server'
import { listShopSubcategoriesWithProducts } from '@/lib/products-db'
import { getDbErrorMessage } from '@/lib/db-errors'
import { CATALOG_FILTER_CACHE_CONTROL, jsonCached } from '@/lib/http-cache'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Subcategories under ?category= that have active products (optional ?brand=). */
export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get('category')?.trim()
    if (!category || category === 'All') {
      return jsonCached({ subcategories: [] }, CATALOG_FILTER_CACHE_CONTROL)
    }

    const brand = request.nextUrl.searchParams.get('brand')?.trim() || undefined
    const subcategories = await listShopSubcategoriesWithProducts(category, brand)
    return jsonCached({ subcategories }, CATALOG_FILTER_CACHE_CONTROL)
  } catch (error) {
    console.error('Subcategories fetch error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load subcategories') },
      { status: 503 }
    )
  }
}
