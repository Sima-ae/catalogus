import { NextResponse } from 'next/server'
import {
  listShopCategoryNavTree,
  warmShopCatalogCountCaches,
} from '@/lib/products-db'
import { getDbErrorMessage } from '@/lib/db-errors'
import { CATALOG_FILTER_CACHE_CONTROL, jsonCached } from '@/lib/http-cache'
import { resolveStoreModeFromHeaders } from '@/lib/store-host'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Hierarchical shop categories for sidebar (roots → sub → nested, no brands). */
export async function GET(request: Request) {
  try {
    const featuredOnly = resolveStoreModeFromHeaders(request.headers) === 'featured'
    // Warm count buckets once for Super Clones (never for featured — keeps 1-1.club light).
    if (!featuredOnly) {
      warmShopCatalogCountCaches()
    }
    const tree = await listShopCategoryNavTree({ featuredOnly })
    return jsonCached({ tree }, CATALOG_FILTER_CACHE_CONTROL)
  } catch (error) {
    console.error('Shop category nav fetch error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load shop category navigation') },
      { status: 503 }
    )
  }
}
