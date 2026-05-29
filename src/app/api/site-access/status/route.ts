import { NextResponse } from 'next/server'
import {
  applySiteAccessCookies,
  readUnlockCookie,
  verifyUnlockToken,
} from '@/lib/site-access-cookie'
import { getSiteAccessConfig } from '@/lib/site-access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const config = await getSiteAccessConfig()
    const cookie = readUnlockCookie(request.headers.get('cookie'))
    const unlocked =
      !config.required || (await verifyUnlockToken(cookie, config.version))

    const res = NextResponse.json({
      required: config.required,
      unlocked,
    })
    applySiteAccessCookies(res, {
      required: config.required,
      version: config.version,
    })
    return res
  } catch (error) {
    console.error('Site access status error:', error)
    const res = NextResponse.json({ required: false, unlocked: true })
    applySiteAccessCookies(res, { required: false, version: 0 })
    return res
  }
}
