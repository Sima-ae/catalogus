import { NextResponse } from 'next/server'
import {
  getSiteAccessConfig,
  readUnlockCookie,
  verifyUnlockToken,
} from '@/lib/site-access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Used by middleware to decide if the request may proceed. */
export async function GET(request: Request) {
  try {
    const config = await getSiteAccessConfig()
    if (!config.required) {
      return NextResponse.json({ required: false, allowed: true })
    }

    const cookie = readUnlockCookie(request.headers.get('cookie'))
    const allowed = verifyUnlockToken(cookie, config.version)

    return NextResponse.json({ required: true, allowed })
  } catch (error) {
    console.error('Site access check error:', error)
    return NextResponse.json({ required: false, allowed: true })
  }
}
