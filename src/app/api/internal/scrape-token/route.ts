import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { queryDb } from '@/lib/db'
import { isDbConnectionError } from '@/lib/db'
import { logDbRouteError } from '@/lib/db-route-log'
import { isSuperAdminUser } from '@/lib/user-roles'
import {
  SCRAPE_TOKEN_TTL_SEC,
  createScrapeAccessToken,
} from '@/lib/scrape-access'
import { NO_INDEX_RESPONSE_HEADERS } from '@/lib/no-index'
import { isRateLimitedIp } from '@/lib/bot-traffic'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type DbUser = {
  id: string
  email: string
  password_hash: string
  role: 'admin' | 'buyer' | 'seller'
  name: string | null
  is_super_admin?: number | boolean
}

/**
 * Issue a short-lived scrape token for our own apps.
 * Requires super-admin email + password. Without this token (or SCRAPE_BYPASS_SECRET),
 * middleware permanently 404s crawlers / scrapers / search bots.
 *
 * Usage:
 *   POST /api/internal/scrape-token
 *   { "email": "…", "password": "…" }
 *   → { "token", "expiresAt", "header": "X-Catalogus-Scrape-Token" }
 *
 * Then send header on scrape requests:
 *   X-Catalogus-Scrape-Token: <token>
 */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'

  // Hard cap brute-force (Edge also rate-limits this path).
  if (isRateLimitedIp(`scrape-token:${ip}`, 8, 60_000)) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      {
        status: 429,
        headers: { ...NO_INDEX_RESPONSE_HEADERS, 'Retry-After': '60', 'Cache-Control': 'no-store' },
      }
    )
  }

  let body: { email?: unknown; password?: unknown; ttlSec?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: NO_INDEX_RESPONSE_HEADERS }
    )
  }

  const email = String(body?.email || '').trim().toLowerCase()
  const password = String(body?.password || '')
  const ttlRaw = Number(body?.ttlSec)
  const ttlSec =
    Number.isFinite(ttlRaw) && ttlRaw > 0
      ? Math.min(Math.floor(ttlRaw), SCRAPE_TOKEN_TTL_SEC * 7)
      : SCRAPE_TOKEN_TTL_SEC

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400, headers: NO_INDEX_RESPONSE_HEADERS }
    )
  }

  try {
    let rows: DbUser[]
    try {
      rows = await queryDb<DbUser[]>(
        'SELECT id, email, password_hash, role, name, is_super_admin FROM users WHERE LOWER(email) = ? LIMIT 1',
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
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401, headers: NO_INDEX_RESPONSE_HEADERS }
      )
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401, headers: NO_INDEX_RESPONSE_HEADERS }
      )
    }

    if (!isSuperAdminUser(user)) {
      return NextResponse.json(
        { error: 'Super admin required' },
        { status: 403, headers: NO_INDEX_RESPONSE_HEADERS }
      )
    }

    const issued = await createScrapeAccessToken(user.id, ttlSec)
    if (!issued) {
      return NextResponse.json(
        {
          error:
            'Scrape tokens are not configured. Set SITE_ACCESS_COOKIE_SECRET (16+ chars) and restart.',
        },
        { status: 503, headers: NO_INDEX_RESPONSE_HEADERS }
      )
    }

    return NextResponse.json(
      {
        token: issued.token,
        expiresAt: issued.expiresAt,
        header: 'X-Catalogus-Scrape-Token',
        usage:
          'Send header X-Catalogus-Scrape-Token on scrape requests from your own apps. Third-party crawlers remain blocked.',
      },
      { status: 200, headers: { ...NO_INDEX_RESPONSE_HEADERS, 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    logDbRouteError('Scrape token error', error)
    const message = isDbConnectionError(error)
      ? 'Unable to verify credentials right now.'
      : 'Unable to issue scrape token.'
    return NextResponse.json(
      { error: message },
      { status: 500, headers: NO_INDEX_RESPONSE_HEADERS }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. POST email + password (super admin).' },
    { status: 405, headers: NO_INDEX_RESPONSE_HEADERS }
  )
}
