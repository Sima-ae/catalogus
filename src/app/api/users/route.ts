import { NextResponse } from 'next/server'
import { listUsers } from '@/lib/users-db'
import { isDevDataFallbackEnabled } from '@/lib/dev-seed'
import { getDevBadgeRating } from '@/lib/dev-user-badges'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEV_USERS = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'info@000.it.com',
    role: 'admin',
    name: 'Super Admin',
    is_super_admin: true,
    badge_rating: null,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    email: 'buyer@test.com',
    role: 'buyer',
    name: 'Test Buyer',
    is_super_admin: false,
    badge_rating: null,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    email: 'seller@test.com',
    role: 'seller',
    name: 'Test Seller',
    is_super_admin: false,
    badge_rating: null,
  },
]

export async function GET() {
  try {
    const rows = await listUsers()
    return NextResponse.json(rows)
  } catch (error) {
    console.error('Users fetch error:', error)
    if (isDevDataFallbackEnabled()) {
      return NextResponse.json(
        DEV_USERS.map((u) => ({
          ...u,
          badge_rating: getDevBadgeRating(u.id) ?? u.badge_rating,
        }))
      )
    }
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
  }
}
