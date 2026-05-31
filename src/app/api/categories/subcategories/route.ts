import { NextRequest, NextResponse } from 'next/server'
import { listShopSubcategoriesWithProducts } from '@/lib/products-db'
import { getDbErrorMessage } from '@/lib/db-errors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Subcategories under ?category= that have active products (optional ?brand=). */
export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get('category')?.trim()
    if (!category || category === 'All') {
      return NextResponse.json({ subcategories: [] })
    }

    const brand = request.nextUrl.searchParams.get('brand')?.trim() || undefined
    const subcategories = await listShopSubcategoriesWithProducts(category, brand)
    return NextResponse.json({ subcategories })
  } catch (error) {
    console.error('Subcategories fetch error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load subcategories') },
      { status: 503 }
    )
  }
}
