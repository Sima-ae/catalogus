import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { deleteUser, getUserProfile, updateUser } from '@/lib/users-db'
import { clampBadgeRating, type UserListRow } from '@/lib/user-roles'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { id: string } }

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function assertCanAccessTarget(
  auth: { ok: true; actor: { userId: string; isSuperAdmin: boolean } },
  target: UserListRow,
  action: 'edit' | 'delete'
): NextResponse | null {
  if (target.is_super_admin && !auth.actor.isSuperAdmin) {
    return jsonError('Only super admin can modify this account', 403)
  }
  if (action === 'delete' && !auth.actor.isSuperAdmin) {
    return jsonError('Only super admin can delete users', 403)
  }
  return null
}

function parseUpdateBody(body: unknown, allowBadge: boolean) {
  if (!body || typeof body !== 'object') return null
  const raw = body as Record<string, unknown>
  const email = raw.email != null ? String(raw.email).trim().toLowerCase() : undefined
  const password = raw.password != null ? String(raw.password) : undefined
  const name =
    raw.name === null || raw.name === undefined ? undefined : String(raw.name).trim() || null
  const roleRaw = raw.role != null ? String(raw.role).trim().toLowerCase() : undefined
  const role =
    roleRaw === 'admin' || roleRaw === 'buyer' || roleRaw === 'seller' ? roleRaw : undefined

  let badge_rating: number | null | undefined = undefined
  let updateBadgeRating = false
  if (allowBadge && 'badge_rating' in raw) {
    updateBadgeRating = true
    badge_rating =
      raw.badge_rating === null || raw.badge_rating === undefined || raw.badge_rating === ''
        ? null
        : clampBadgeRating(raw.badge_rating)
    if (
      raw.badge_rating !== null &&
      raw.badge_rating !== undefined &&
      raw.badge_rating !== '' &&
      badge_rating === null
    ) {
      return null
    }
  }

  if (!email && !password && name === undefined && !role && !updateBadgeRating) {
    return null
  }

  return { email, password, name, role, badge_rating, updateBadgeRating }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) return jsonError(auth.error, auth.status)

  try {
    const target = await getUserProfile(params.id)
    if (!target) return jsonError('User not found', 404)
    return NextResponse.json(target)
  } catch (error) {
    console.error('Admin user GET error:', error)
    return jsonError(getDbErrorMessage(error, 'Failed to load user'), 503)
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) return jsonError(auth.error, auth.status)

  const body = await request.json().catch(() => null)
  const input = parseUpdateBody(body, auth.actor.isSuperAdmin)
  if (!input) {
    return jsonError('Invalid update payload', 400)
  }

  try {
    const target = await getUserProfile(params.id)
    if (!target) return jsonError('User not found', 404)

    const denied = assertCanAccessTarget(auth, target, 'edit')
    if (denied) return denied

    const updated = await updateUser(
      {
        email: input.email,
        password: input.password,
        name: input.name,
        role: input.role,
        badge_rating: input.badge_rating,
        updateBadgeRating: input.updateBadgeRating,
      },
      params.id
    )
    return NextResponse.json(updated)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message === 'NOT_FOUND') return jsonError('User not found', 404)
    if (message === 'EMAIL_EXISTS') {
      return jsonError('A user with this email already exists', 409)
    }
    if (message === 'SUPER_ADMIN_ROLE') {
      return jsonError('Super admin must keep the admin role', 400)
    }
    if (message.includes('Password must be') || message.includes('Invalid role') || message.includes('Rating')) {
      return jsonError(message, 400)
    }
    console.error('Admin user PATCH error:', error)
    return jsonError(getDbErrorMessage(error, 'Failed to update user'), 503)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) return jsonError(auth.error, auth.status)

  if (!auth.actor.isSuperAdmin) {
    return jsonError('Only super admin can delete users', 403)
  }

  if (params.id === auth.actor.userId) {
    return jsonError('You cannot delete your own account', 400)
  }

  try {
    const target = await getUserProfile(params.id)
    if (!target) return jsonError('User not found', 404)

    const denied = assertCanAccessTarget(auth, target, 'delete')
    if (denied) return denied

    await deleteUser(params.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message === 'NOT_FOUND') return jsonError('User not found', 404)
    if (message === 'SUPER_ADMIN_DELETE') {
      return jsonError('Super admin account cannot be deleted', 400)
    }
    if (message === 'HAS_REFERENCES') {
      return jsonError(
        'User cannot be deleted because they are linked to orders or other records',
        409
      )
    }
    console.error('Admin user DELETE error:', error)
    return jsonError(getDbErrorMessage(error, 'Failed to delete user'), 503)
  }
}
