import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { queryDb } from '@/lib/db'
import { isDevAuthEnabled, tryDevLogin } from '@/lib/dev-auth'
import { isSuperAdminUser } from '@/lib/user-roles'
import { isDbConnectionError } from '@/lib/db'
import { logDbRouteError } from '@/lib/db-route-log'
import { clientIp } from '@/lib/request-client-ip'
import { isRateLimitedIp } from '@/lib/bot-traffic'
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
} from '@/lib/admin-session'

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

export async function POST(request: NextRequest) {
  const ip = clientIp(request)
  if (isRateLimitedIp(`login:${ip}`, 10, 60_000)) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts. Try again in a minute.' },
      { status: 429 }
    )
  }

  const body = await request.json()
  const email = String(body?.email || '').trim().toLowerCase()
  const password = String(body?.password || '')

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const attachSession = async (
    res: NextResponse,
    userId: string,
    userEmail: string,
    role: string
  ) => {
    if (role !== 'admin') return res
    const session = await createAdminSessionToken(userId, userEmail)
    if (session) {
      res.cookies.set(
        ADMIN_SESSION_COOKIE,
        session.token,
        getAdminSessionCookieOptions(session.maxAge)
      )
    }
    return res
  }

  // Dev fallback first (no DB needed when AUTH_DEV_FALLBACK=true)
  if (isDevAuthEnabled()) {
    const devUser = await tryDevLogin(email, password)
    if (devUser) {
      const res = NextResponse.json({
        user: {
          ...devUser,
          badge_rating: null,
        },
      })
      return attachSession(res, devUser.id, devUser.email, devUser.role)
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

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name || user.email.split('@')[0],
        is_super_admin: isSuperAdminUser(user),
        badge_rating: user.badge_rating != null ? Number(user.badge_rating) : null,
      },
    })
    return attachSession(res, user.id, user.email, user.role)
  } catch (error) {
    logDbRouteError('Login error', error)

    if (isDevAuthEnabled() && isDbConnectionError(error)) {
      return NextResponse.json(
        {
          error:
            'Sign-in service is temporarily unavailable. If you are developing locally, ensure MariaDB is running or enable dev auth in your environment.',
        },
        { status: 503 }
      )
    }

    let message = 'Sign-in service is temporarily unavailable.'
    if (error instanceof Error && error.message.includes('not configured')) {
      message = 'Sign-in service is not configured. Contact the site administrator.'
    } else if (isDbConnectionError(error)) {
      message = 'Unable to connect to the sign-in service. Try again later or contact support.'
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
