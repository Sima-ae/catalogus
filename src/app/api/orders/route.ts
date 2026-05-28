import { NextResponse } from 'next/server'
import { queryDb } from '@/lib/db'
import { useDevDataFallback } from '@/lib/dev-seed'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const rows = await queryDb('SELECT * FROM orders ORDER BY created_at DESC')
    return NextResponse.json(rows)
  } catch (error) {
    console.error('Orders fetch error:', error)
    if (useDevDataFallback()) {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 })
  }
}
