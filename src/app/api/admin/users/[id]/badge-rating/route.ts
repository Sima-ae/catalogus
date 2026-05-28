import { NextRequest, NextResponse } from 'next/server'
import { parseAdminCredentials, verifySuperAdmin } from '@/lib/admin-api-auth'
import { updateUserBadgeRating } from '@/lib/users-db'
import { clampBadgeRating } from '@/lib/user-roles'
import { isDevDataFallbackEnabled } from '@/lib/dev-seed'
import { setDevBadgeRating } from '@/lib/dev-user-badges'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { id: string } }

/** Super admin only: assign 1–5 star badge to a buyer/seller (or clear). */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const userId = params.id
  if (!userId) {
    return NextResponse.json({ error: 'User id required' }, { status: 400 })
  }

  const body = await request.json()
  const creds = parseAdminCredentials(body)
  if (!creds) {
    return NextResponse.json({ error: 'Super admin email and password required' }, { status: 400 })
  }

  const admin = await verifySuperAdmin(creds.email, creds.password)
  if (!admin.ok) {
    return NextResponse.json({ error: 'Super admin access denied' }, { status: 403 })
  }

  const rating =
    body.rating === null || body.rating === undefined
      ? null
      : clampBadgeRating(body.rating)

  if (body.rating !== null && body.rating !== undefined && rating === null) {
    return NextResponse.json({ error: 'Rating must be 1–5 or null' }, { status: 400 })
  }

  try {
    const updated = await updateUserBadgeRating(userId, rating)
    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    return NextResponse.json({
      id: updated.id,
      badge_rating: updated.badge_rating,
    })
  } catch (error) {
    console.error('Badge rating update error:', error)
    if (isDevDataFallbackEnabled()) {
      setDevBadgeRating(userId, rating)
      return NextResponse.json({ id: userId, badge_rating: rating })
    }
    return NextResponse.json({ error: 'Failed to update rating' }, { status: 500 })
  }
}
