import { NextResponse } from 'next/server'
import { queryDb } from '@/lib/db'
import { getDbErrorMessage } from '@/lib/db-errors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const rows = await queryDb('SELECT * FROM orders ORDER BY created_at DESC')
    return NextResponse.json(rows)
  } catch (error) {
    console.error('Orders fetch error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load orders') },
      { status: 503 }
    )
  }
}
