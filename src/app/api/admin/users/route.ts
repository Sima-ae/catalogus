import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import {
  assignSiteAccessCodeToUser,
  getSiteAccessCodeForUser,
} from '@/lib/site-access-codes-db'
import { createUser, deleteUser, listUsers } from '@/lib/users-db'
import { clampBadgeRating } from '@/lib/user-roles'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function parseCreateUserBody(body: unknown): {
  email: string
  password: string
  name: string | null
  role: 'admin' | 'buyer' | 'seller'
  badge_rating: number | null | undefined
  site_access_code: string | null
} | null {
  if (!body || typeof body !== 'object') return null
  const raw = body as Record<string, unknown>
  const email = String(raw.email ?? '').trim().toLowerCase()
  const password = String(raw.password ?? '')
  const nameRaw = String(raw.name ?? '').trim()
  const roleRaw = String(raw.role ?? 'buyer').trim().toLowerCase()
  if (!email || !password) return null
  if (roleRaw !== 'admin' && roleRaw !== 'buyer' && roleRaw !== 'seller') return null

  const badge_rating =
    raw.badge_rating === null || raw.badge_rating === undefined || raw.badge_rating === ''
      ? undefined
      : clampBadgeRating(raw.badge_rating)

  if (
    raw.badge_rating !== null &&
    raw.badge_rating !== undefined &&
    raw.badge_rating !== '' &&
    badge_rating === null
  ) {
    return null
  }

  const codeRaw = raw.site_access_code != null ? String(raw.site_access_code).trim() : ''

  return {
    email,
    password,
    name: nameRaw || null,
    role: roleRaw,
    badge_rating,
    site_access_code: codeRaw || null,
  }
}

/** Admin: list users. */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    return NextResponse.json(await listUsers())
  } catch (error) {
    console.error('Admin users list error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load users') },
      { status: 503 }
    )
  }
}

/** Admin: create a new user account. */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  const input = parseCreateUserBody(body)
  if (!input) {
    return NextResponse.json(
      { error: 'Email, password (8+ chars), and role (buyer, seller, or admin) are required' },
      { status: 400 }
    )
  }

  if (input.role === 'admin' && input.site_access_code) {
    return NextResponse.json(
      { error: 'Site access codes can only be assigned to buyer or seller accounts' },
      { status: 400 }
    )
  }

  if (input.role === 'buyer' && !input.site_access_code) {
    return NextResponse.json(
      { error: 'An admin must assign a personal site access code when creating a buyer' },
      { status: 400 }
    )
  }

  try {
    const user = await createUser({
      email: input.email,
      password: input.password,
      name: input.name,
      role: input.role,
      badge_rating: input.badge_rating,
    })

    if (input.site_access_code) {
      try {
        await assignSiteAccessCodeToUser({
          code: input.site_access_code,
          userId: user.id,
        })
      } catch (assignError) {
        await deleteUser(user.id).catch(() => {})
        const assignMsg = assignError instanceof Error ? assignError.message : ''
        if (assignMsg === 'CODE_NOT_FOUND') {
          return NextResponse.json({ error: 'Access code not found in the pool' }, { status: 400 })
        }
        if (assignMsg === 'CODE_ALREADY_ASSIGNED') {
          return NextResponse.json({ error: 'This access code is already assigned to another user' }, { status: 409 })
        }
        if (assignMsg === 'USER_ALREADY_HAS_CODE') {
          return NextResponse.json({ error: 'User already has an access code' }, { status: 409 })
        }
        if (assignMsg === 'INVALID_SITE_ACCESS_CODE') {
          return NextResponse.json({ error: 'Invalid access code format' }, { status: 400 })
        }
        throw assignError
      }
      const assignedCode = await getSiteAccessCodeForUser(user.id)
      return NextResponse.json({ ...user, site_access_code: assignedCode }, { status: 201 })
    }

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message === 'EMAIL_EXISTS') {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
    }
    if (message.includes('Password must be') || message.includes('Invalid role') || message.includes('Rating')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error('Admin create user error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to create user') },
      { status: 503 }
    )
  }
}
