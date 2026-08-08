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
import {
  resolveRequestHostname,
  siteAccessAppliesToHost,
} from '@/lib/store-host'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  ensureEnvLoaded()
  try {
    // Featured hosts (1-1.club) are public — ignore global site-access setting.
    if (!siteAccessAppliesToHost(resolveRequestHostname(request.headers))) {
      const res = NextResponse.json({
        required: false,
        unlocked: true,
        sessionActive: true,
      })
      await applySiteAccessCookies(res, { required: false, version: 0 })
      return res
    }

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
    await applySiteAccessCookies(res, {
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
    await applySiteAccessCookies(res, { required: false, version: 0 })
    return res
  }
}
