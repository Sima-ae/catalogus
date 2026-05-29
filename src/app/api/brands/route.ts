import { NextResponse } from 'next/server'
import { loadActiveBrands } from '@/lib/brands-persistence'
import { getDbErrorMessage } from '@/lib/db-errors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Public read — active brands from the database. */
export async function GET() {
  try {
    const rows = await loadActiveBrands()
    return NextResponse.json(rows)
  } catch (error) {
    console.error('Brands fetch error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load brands') },
      { status: 503 }
    )
  }
}
