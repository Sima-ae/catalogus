import { NextResponse } from 'next/server'
import { getDbErrorMessage } from '@/lib/db-errors'
import { getUserProfile } from '@/lib/users-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load profile') },
      { status: 503 }
    )
  }
}
