import { NextRequest, NextResponse } from 'next/server'
import {
  SITE_ACCESS_COOKIE,
  createUnlockToken,
  getSiteAccessConfig,
  verifySiteAccessPassword,
} from '@/lib/site-access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const password = String(body?.password ?? '')
    const remember = body?.remember === true || body?.remember === 'true'

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    const config = await getSiteAccessConfig()
    if (!config.required) {
      return NextResponse.json({ unlocked: true })
    }

    const valid = await verifySiteAccessPassword(password)
    if (!valid) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    const { token, maxAge } = createUnlockToken(config.version, remember)
    const res = NextResponse.json({ unlocked: true })
    res.cookies.set(SITE_ACCESS_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    })
    return res
  } catch (error) {
    console.error('Site access verify error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
