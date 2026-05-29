import { NextRequest, NextResponse } from 'next/server'
import {
  applySiteAccessCookies,
  createUnlockToken,
} from '@/lib/site-access-cookie'
import { getSiteAccessConfig, verifySiteAccessPassword } from '@/lib/site-access'

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
      const res = NextResponse.json({ unlocked: true })
      applySiteAccessCookies(res, { required: false, version: config.version })
      return res
    }

    const valid = await verifySiteAccessPassword(password)
    if (!valid) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    const unlock = await createUnlockToken(config.version, remember)
    const res = NextResponse.json({ unlocked: true })
    applySiteAccessCookies(
      res,
      { required: true, version: config.version },
      unlock
    )
    return res
  } catch (error) {
    console.error('Site access verify error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
