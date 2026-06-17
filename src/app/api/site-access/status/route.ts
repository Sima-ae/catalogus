import { NextResponse } from 'next/server'
import { ensureEnvLoaded } from '@/lib/ensure-env'
import {
  applySiteAccessCookies,
  readActiveSessionCookie,
  readUnlockCookie,
  verifyActiveSessionToken,
  verifyUnlockToken,
} from '@/lib/site-access-cookie'
import { getSiteAccessConfig } from '@/lib/site-access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  ensureEnvLoaded()
  try {
    const config = await getSiteAccessConfig()
    const cookieHeader = request.headers.get('cookie')
    const unlockCookie = readUnlockCookie(cookieHeader)
    const activeCookie = readActiveSessionCookie(cookieHeader)

    const unlocked =
      !config.required || (await verifyUnlockToken(unlockCookie, config.version))
    const sessionActive =
      !config.required ||
      (unlocked && (await verifyActiveSessionToken(activeCookie, config.version)))

    const res = NextResponse.json({
      required: config.required,
      unlocked,
      sessionActive,
    })
    applySiteAccessCookies(res, {
      required: config.required,
      version: config.version,
    })
    return res
  } catch (error) {
    console.error('Site access status error:', error)
    const res = NextResponse.json({
      required: false,
      unlocked: true,
      sessionActive: true,
    })
    applySiteAccessCookies(res, { required: false, version: 0 })
    return res
  }
}
