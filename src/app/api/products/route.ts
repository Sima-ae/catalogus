import { NextResponse } from 'next/server'
import { queryDb } from '@/lib/db'
import { DEV_PRODUCTS, useDevDataFallback } from '@/lib/dev-seed'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const rows = await queryDb('SELECT * FROM products ORDER BY created_at DESC')
    return NextResponse.json(rows)
  } catch (error) {
    console.error('Products fetch error:', error)
    if (useDevDataFallback()) {
      return NextResponse.json(DEV_PRODUCTS)
    }
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
  }
}
