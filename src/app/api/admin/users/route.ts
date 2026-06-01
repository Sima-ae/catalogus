import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { createUser, listUsers } from '@/lib/users-db'
import { clampBadgeRating } from '@/lib/user-roles'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function parseCreateUserBody(body: unknown): {
  email: string
  password: string
  name: string | null
  role: 'admin' | 'buyer' | 'seller'
  badge_rating: number | null | undefined
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

  return {
    email,
    password,
    name: nameRaw || null,
    role: roleRaw,
    badge_rating,
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

  try {
    const user = await createUser({
      email: input.email,
      password: input.password,
      name: input.name,
      role: input.role,
      badge_rating: input.badge_rating,
    })
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
