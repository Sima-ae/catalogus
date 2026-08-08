import { NextResponse } from 'next/server'
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionCookieOptions,
} from '@/lib/admin-session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Clear HttpOnly admin session cookie. */
export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_SESSION_COOKIE, '', getAdminSessionCookieOptions(0))
  return res
}
