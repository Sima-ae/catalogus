import { NextResponse } from 'next/server'
import { queryDb } from '@/lib/db'
import { useDevDataFallback } from '@/lib/dev-seed'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEV_USERS = [
  { id: 'a0000000-0000-0000-0000-000000000001', email: 'info@000.it.com', role: 'admin', name: 'Super Admin' },
  { id: 'a0000000-0000-0000-0000-000000000002', email: 'buyer@test.com', role: 'buyer', name: 'Test Buyer' },
  { id: 'a0000000-0000-0000-0000-000000000003', email: 'seller@test.com', role: 'seller', name: 'Test Seller' },
]

export async function GET() {
  try {
    const rows = await queryDb(
      'SELECT id, email, role, name, created_at, updated_at FROM users ORDER BY created_at DESC'
    )
    return NextResponse.json(rows)
  } catch (error) {
    console.error('Users fetch error:', error)
    if (useDevDataFallback()) {
      return NextResponse.json(DEV_USERS)
    }
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
  }
}
