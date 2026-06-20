import { NextResponse } from 'next/server'
import { listShopTopCategoriesWithProducts } from '@/lib/products-db'
import { getDbErrorMessage } from '@/lib/db-errors'
import { CATALOG_FILTER_CACHE_CONTROL, jsonCached } from '@/lib/http-cache'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Top-level shop category labels with at least one active product. */
export async function GET() {
  try {
    const menu = await listShopTopCategoriesWithProducts()
    return jsonCached(menu, CATALOG_FILTER_CACHE_CONTROL)
  } catch (error) {
    console.error('Shop category menu fetch error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load shop categories') },
      { status: 503 }
    )
  }
}
