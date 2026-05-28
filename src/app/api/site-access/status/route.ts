import { NextResponse } from 'next/server'
import {
  getSiteAccessConfig,
  readUnlockCookie,
  verifyUnlockToken,
} from '@/lib/site-access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const config = await getSiteAccessConfig()
    const cookie = readUnlockCookie(request.headers.get('cookie'))
    const unlocked =
      !config.required ||
      verifyUnlockToken(cookie, config.version)

    return NextResponse.json({
      required: config.required,
      unlocked,
    })
  } catch (error) {
    console.error('Site access status error:', error)
    return NextResponse.json(
      { required: false, unlocked: true },
      { status: 200 }
    )
  }
}
