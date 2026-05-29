import { NextResponse } from 'next/server'
import { loadActiveCategories } from '@/lib/categories-persistence'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Public read — shop filters and product forms. */
export async function GET() {
  try {
    const { rows } = await loadActiveCategories()
    return NextResponse.json(rows)
  } catch (error) {
    console.error('Categories fetch error:', error)
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 })
  }
}
