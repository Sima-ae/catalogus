import { NextResponse } from 'next/server'
import { queryDb } from '@/lib/db'
import { getDbErrorMessage } from '@/lib/db-errors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function socialProofLabel(name: string, sku: string | null): string | null {
  const n = name?.trim()
  if (n) return n
  const s = sku?.trim()
  return s || null
}

/** Published product labels for client-side daily social-proof (persisted per browser/day). */
export async function GET() {
  try {
    const rows = await queryDb<{ name: string; sku: string | null }[]>(
      `SELECT name, sku FROM products
       WHERE status = 'active'
         AND (
           (name IS NOT NULL AND TRIM(name) <> '')
           OR (sku IS NOT NULL AND TRIM(sku) <> '')
         )
       ORDER BY RAND()
       LIMIT 200`
    )
    const productNames = Array.from(
      new Set(
        rows
          .map((r) => socialProofLabel(r.name, r.sku))
          .filter((label): label is string => Boolean(label))
      )
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
