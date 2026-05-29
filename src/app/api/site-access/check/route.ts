import { NextResponse } from 'next/server'
import { ensureEnvLoaded } from '@/lib/ensure-env'
import {
  applySiteAccessCookies,
  readUnlockCookie,
  verifyUnlockToken,
} from '@/lib/site-access-cookie'
import { getSiteAccessConfig } from '@/lib/site-access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Used by middleware when meta cookies are not yet set. */
export async function GET(request: Request) {
  ensureEnvLoaded()
  try {
    const config = await getSiteAccessConfig()
    const cookie = readUnlockCookie(request.headers.get('cookie'))
    const allowed =
      !config.required || (await verifyUnlockToken(cookie, config.version))

    const res = NextResponse.json({
      required: config.required,
      allowed,
    })
    applySiteAccessCookies(res, {
      required: config.required,
      version: config.version,
    })
    return res
  } catch (error) {
    console.error('Site access check error:', error)
    const res = NextResponse.json({ required: false, allowed: true })
    applySiteAccessCookies(res, { required: false, version: 0 })
    return res
  }
}
