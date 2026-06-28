import { NextResponse } from 'next/server'
import { listShopCategoryNavTree } from '@/lib/products-db'
import { getDbErrorMessage } from '@/lib/db-errors'
import { CATALOG_FILTER_CACHE_CONTROL, jsonCached } from '@/lib/http-cache'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Hierarchical shop categories for sidebar (roots → sub → nested, no brands). */
export async function GET() {
  try {
    const tree = await listShopCategoryNavTree()
    return jsonCached({ tree }, CATALOG_FILTER_CACHE_CONTROL)
  } catch (error) {
    console.error('Shop category nav fetch error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load shop category navigation') },
      { status: 503 }
    )
  }
}
