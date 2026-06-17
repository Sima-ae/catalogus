import { NextResponse } from 'next/server'
import { ensureEnvLoaded } from '@/lib/ensure-env'
import {
  applySiteAccessCookies,
  clearSiteAccessActiveCookie,
} from '@/lib/site-access-cookie'
import { getSiteAccessConfig } from '@/lib/site-access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Clear active session after client inactivity timeout (unlock cookie is kept). */
export async function POST() {
  ensureEnvLoaded()
  try {
    const config = await getSiteAccessConfig()
    const res = NextResponse.json({ locked: true })
    clearSiteAccessActiveCookie(res)
    applySiteAccessCookies(res, {
      required: config.required,
      version: config.version,
    })
    return res
  } catch (error) {
    console.error('Site access lock error:', error)
    return NextResponse.json({ error: 'Lock failed' }, { status: 500 })
  }
}
