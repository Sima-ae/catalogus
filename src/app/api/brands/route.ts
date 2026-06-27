import { NextRequest, NextResponse } from 'next/server'
import { loadActiveBrands } from '@/lib/brands-persistence'
import { getDbErrorMessage } from '@/lib/db-errors'
import { CATALOG_FILTER_CACHE_CONTROL, jsonCached } from '@/lib/http-cache'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Public read — active brands; ?category= lists only brands with ≥1 active product in scope. */
export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get('category')?.trim() || undefined
    const subcategory = request.nextUrl.searchParams.get('subcategory')?.trim() || undefined
    const nested = request.nextUrl.searchParams.get('nested')?.trim() || undefined
    const rows = await loadActiveBrands(category, subcategory, nested)
    return jsonCached(rows, CATALOG_FILTER_CACHE_CONTROL)
  } catch (error) {
    console.error('Brands fetch error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load brands') },
      { status: 503 }
    )
  }
}
