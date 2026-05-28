import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/users-db'
import { isDevDataFallbackEnabled } from '@/lib/dev-seed'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEV_PROFILES: Record<string, { id: string; name: string; role: string; badge_rating: number | null; is_super_admin: boolean }> = {
  'a0000000-0000-0000-0000-000000000001': {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'Super Admin',
    role: 'admin',
    badge_rating: null,
    is_super_admin: true,
  },
  'a0000000-0000-0000-0000-000000000002': {
    id: 'a0000000-0000-0000-0000-000000000002',
    name: 'Test Buyer',
    role: 'buyer',
    badge_rating: null,
    is_super_admin: false,
  },
  'a0000000-0000-0000-0000-000000000003': {
    id: 'a0000000-0000-0000-0000-000000000003',
    name: 'Test Seller',
    role: 'seller',
    badge_rating: null,
    is_super_admin: false,
  },
}

type RouteContext = { params: { id: string } }

/** Public profile fields (badge + role) for dashboards and listings. */
export async function GET(_request: Request, { params }: RouteContext) {
  const userId = params.id
  if (!userId) {
    return NextResponse.json({ error: 'User id required' }, { status: 400 })
  }

  try {
    const profile = await getUserProfile(userId)
    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    return NextResponse.json({
      id: profile.id,
      name: profile.name,
      role: profile.role,
      is_super_admin: Boolean(profile.is_super_admin),
      badge_rating: profile.badge_rating ?? null,
    })
  } catch (error) {
    console.error('User profile fetch error:', error)
    if (isDevDataFallbackEnabled() && DEV_PROFILES[userId]) {
      return NextResponse.json(DEV_PROFILES[userId])
    }
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
  }
}
