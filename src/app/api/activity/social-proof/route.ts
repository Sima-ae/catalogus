import { NextResponse } from 'next/server'
import { queryDb } from '@/lib/db'
import { getDbErrorMessage } from '@/lib/db-errors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Product names for client-side daily social-proof generation (persisted per browser/day). */
export async function GET() {
  try {
    const rows = await queryDb<{ name: string }[]>(
      `SELECT name FROM products
       WHERE name IS NOT NULL AND TRIM(name) <> ''
       ORDER BY RAND()
       LIMIT 120`
    )
    const productNames = Array.from(
      new Set(rows.map((r) => r.name.trim()).filter(Boolean))
    )
    return NextResponse.json({ productNames })
  } catch (error) {
    console.error('Social proof fetch error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load catalog activity') },
      { status: 503 }
    )
  }
}
