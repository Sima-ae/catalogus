import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { queryDb } from '@/lib/db'
import { isDevAuthEnabled, tryDevLogin } from '@/lib/dev-auth'
import { getDevBadgeRating } from '@/lib/dev-user-badges'
import { isSuperAdminUser } from '@/lib/user-roles'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type DbUser = {
  id: string
  email: string
  password_hash: string
  role: 'admin' | 'buyer' | 'seller'
  name: string | null
  is_super_admin?: number | boolean
  badge_rating?: number | null
}

function isDbConnectionError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: string }).code
  return (
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'PROTOCOL_CONNECTION_LOST'
  )
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const email = String(body?.email || '').trim().toLowerCase()
  const password = String(body?.password || '')

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  // Dev fallback first (no DB needed when AUTH_DEV_FALLBACK=true)
  if (isDevAuthEnabled()) {
    const devUser = await tryDevLogin(email, password)
    if (devUser) {
      return NextResponse.json({
        user: {
          ...devUser,
          badge_rating: getDevBadgeRating(devUser.id),
        },
      })
    }
  }

  try {
    let rows: DbUser[]
    try {
      rows = await queryDb<DbUser[]>(
        'SELECT id, email, password_hash, role, name, is_super_admin, badge_rating FROM users WHERE LOWER(email) = ? LIMIT 1',
        [email]
      )
    } catch {
      rows = await queryDb<DbUser[]>(
        'SELECT id, email, password_hash, role, name FROM users WHERE LOWER(email) = ? LIMIT 1',
        [email]
      )
    }

    const user = rows[0]
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const devRating = getDevBadgeRating(user.id)
    const badge_rating =
      user.badge_rating != null ? Number(user.badge_rating) : devRating

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name || user.email.split('@')[0],
        is_super_admin: isSuperAdminUser(user),
        badge_rating: badge_rating ?? null,
      },
    })
  } catch (error) {
    console.error('Login error:', error)

    if (isDevAuthEnabled() && isDbConnectionError(error)) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    let message = 'Database connection failed.'
    if (error instanceof Error && error.message.includes('not configured')) {
      message = 'Database is not configured. Set DATABASE_URL in .env.'
    } else if (isDbConnectionError(error)) {
      message = 'Unable to connect to the database. Try again later or contact support.'
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
