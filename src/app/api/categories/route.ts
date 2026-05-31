import { NextResponse } from 'next/server'
import { loadActiveCategories } from '@/lib/categories-persistence'
import { serializeCategory } from '@/lib/category-serialize'
import { getDbErrorMessage } from '@/lib/db-errors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Public read — active categories from the database only. */
export async function GET() {
  try {
    const rows = await loadActiveCategories()
    return NextResponse.json(
      rows.map((row) => serializeCategory(row as Record<string, unknown>))
    )
  } catch (error) {
    console.error('Categories fetch error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load categories') },
      { status: 503 }
    )
  }
}
