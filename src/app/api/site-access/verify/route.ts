import { NextRequest, NextResponse } from 'next/server'
import { ensureEnvLoaded } from '@/lib/ensure-env'
import {
  applySiteAccessActiveCookie,
  applySiteAccessCookies,
  createActiveSessionToken,
  createSiteAccessCodeToken,
  createUnlockToken,
  readUnlockCookie,
  siteAccessSecretDiagnostics,
  verifyUnlockToken,
} from '@/lib/site-access-cookie'
import { getSiteAccessConfig, verifySiteAccessPassword } from '@/lib/site-access'
import {
  findSiteAccessCodeByInput,
  isSiteAccessCodeAssigned,
} from '@/lib/site-access-codes-db'
import { checkSiteAccessVerifyRateLimit } from '@/lib/site-access-verify-rate-limit'
import { clientIp } from '@/lib/request-client-ip'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  ensureEnvLoaded()
  try {
    const body = await request.json()
    const password = String(body?.password ?? body?.code ?? '')
    const remember = body?.remember === true || body?.remember === 'true'

    if (!checkSiteAccessVerifyRateLimit(clientIp(request))) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password or access code is required' },
        { status: 400 }
      )
    }

    const config = await getSiteAccessConfig()
    if (!config.required) {
      const res = NextResponse.json({ unlocked: true, sessionActive: true })
      applySiteAccessCookies(res, { required: false, version: config.version })
      return res
    }

    const codeRow = await findSiteAccessCodeByInput(password)
    const valid =
      isSiteAccessCodeAssigned(codeRow) || (await verifySiteAccessPassword(password))
    if (!valid) {
      return NextResponse.json({ error: 'Incorrect password or access code' }, { status: 401 })
    }

    const secretDiag = siteAccessSecretDiagnostics()
    if (!secretDiag.ok) {
      return NextResponse.json({ error: secretDiag.reason }, { status: 503 })
    }

    const cookieHeader = request.headers.get('cookie')
    const existingUnlock = readUnlockCookie(cookieHeader)
    const hasValidUnlock = Boolean(
      existingUnlock && (await verifyUnlockToken(existingUnlock, config.version))
    )

    // Inactivity re-auth: refresh active session only — do not shorten a remembered unlock.
    const refreshActiveOnly = hasValidUnlock && !remember
    let unlock: { token: string; maxAge: number } | null = null
    if (!refreshActiveOnly) {
      unlock = await createUnlockToken(config.version, remember || hasValidUnlock)
      if (!unlock) {
        return NextResponse.json(
          { error: 'Could not create site access session. Restart the app after updating .env.' },
          { status: 503 }
        )
      }
    }

    const active = await createActiveSessionToken(config.version)
    if (!active) {
      return NextResponse.json(
        { error: 'Could not create site access session. Restart the app after updating .env.' },
        { status: 503 }
      )
    }

    const res = NextResponse.json({ unlocked: true, sessionActive: true })
    applySiteAccessCookies(
      res,
      { required: true, version: config.version },
      unlock ?? undefined
    )
    applySiteAccessActiveCookie(res, active)

    if (isSiteAccessCodeAssigned(codeRow)) {
      const codeToken = await createSiteAccessCodeToken(config.version, codeRow!.id)
      if (codeToken) {
        res.cookies.set('rcc_site_code', codeToken.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: codeToken.maxAge,
        })
      }
    } else {
      res.cookies.set('rcc_site_code', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      })
    }
    return res
  } catch (error) {
    console.error('Site access verify error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
