import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  SITE_ACCESS_COOKIE,
  SITE_ACCESS_META_REQUIRED,
  SITE_ACCESS_META_VERSION,
  getCookieSecret,
  verifyUnlockToken,
} from '@/lib/site-access-cookie'

import { isPricelistSharePath, isPricelistApiPath } from '@/lib/pricelist-share-path'
import {
  LOCALE_COOKIE,
  localizedPath,
  parseLocaleFromPathname,
  resolveLocaleFromCookie,
} from '@/lib/i18n-routing'
import { applyNoIndexHeaders } from '@/lib/no-index'

const GATE_PATH = '/site-access-gate'
const LOCALE_HEADER = 'x-catalogus-locale'

function isStaticAsset(pathname: string): boolean {
  if (pathname.startsWith('/_next/static') || pathname.startsWith('/_next/image')) {
    return true
  }
  if (pathname.startsWith('/images/')) {
    return true
  }
  if (pathname === '/favicon.ico') return true
  const publicExt = ['.ico', '.png', '.svg', '.webp', '.jpg', '.jpeg', '.gif', '.woff2', '.woff']
  return publicExt.some((ext) => pathname.endsWith(ext))
}

function shouldSkipLocaleRouting(pathname: string): boolean {
  if (pathname === GATE_PATH || pathname.startsWith(`${GATE_PATH}/`)) return true
  if (pathname.startsWith('/api/')) return true
  return false
}

/** Prefix URLs with locale slug (/en/...) and rewrite internally without the prefix. */
function applyLocaleRouting(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl
  if (shouldSkipLocaleRouting(pathname)) return null

  const { locale: pathLocale, pathnameWithoutLocale } = parseLocaleFromPathname(pathname)
  const cookieLocale = resolveLocaleFromCookie(request.cookies.get(LOCALE_COOKIE)?.value)

  if (pathLocale) {
    const url = request.nextUrl.clone()
    url.pathname = pathnameWithoutLocale
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set(LOCALE_HEADER, pathLocale)
    const res = NextResponse.rewrite(url, { request: { headers: requestHeaders } })
    res.cookies.set(LOCALE_COOKIE, pathLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
    return res
  }

  const url = request.nextUrl.clone()
  url.pathname = localizedPath(pathname, cookieLocale)
  url.search = search
  return NextResponse.redirect(url)
}

function isSiteAccessApi(pathname: string): boolean {
  return pathname.startsWith('/api/site-access/')
}

function isChatApi(pathname: string): boolean {
  return pathname.startsWith('/api/chat/')
}

/** Deploy/diagnostics only — must not require the site-access cookie. */
function isPublicApi(pathname: string): boolean {
  return pathname === '/api/health/db' || pathname === '/api/yupoo-image'
}

/** Edge-safe check using cookies set by verify/status/check (no self-fetch). */
async function siteAccessFromCookies(request: NextRequest): Promise<{
  required: boolean
  allowed: boolean
} | null> {
  const requiredFlag = request.cookies.get(SITE_ACCESS_META_REQUIRED)?.value
  if (requiredFlag === '0') {
    return { required: false, allowed: true }
  }
  if (requiredFlag !== '1') {
    return null
  }

  // Edge middleware cannot read .env at runtime — verify via /api/site-access/check (Node) instead.
  if (!getCookieSecret()) {
    return null
  }

  const version =
    Number.parseInt(request.cookies.get(SITE_ACCESS_META_VERSION)?.value || '0', 10) || 0
  const token = request.cookies.get(SITE_ACCESS_COOKIE)?.value
  let allowed = false
  try {
    allowed = await verifyUnlockToken(token, version)
  } catch {
    allowed = false
  }
  return {
    required: true,
    allowed,
  }
}

async function siteAccessFromApi(request: NextRequest): Promise<{
  required: boolean
  allowed: boolean
}> {
  const checkUrl = new URL('/api/site-access/check', request.nextUrl.origin)
  try {
    const res = await fetch(checkUrl, {
      headers: { cookie: request.headers.get('cookie') || '' },
      cache: 'no-store',
    })
    if (!res.ok) return { required: false, allowed: true }
    return res.json()
  } catch {
    return { required: false, allowed: true }
  }
}

/** Permanent redirect legacy /catalogus URLs to site root. Enforce site-wide access password. */
export async function middleware(request: NextRequest) {
  const finish = (response: NextResponse) => applyNoIndexHeaders(response)

  const { pathname, search } = request.nextUrl

  if (process.env.NODE_ENV === 'production' && pathname === '/debug') {
    const home = request.nextUrl.clone()
    home.pathname = '/'
    home.search = ''
    return finish(NextResponse.redirect(home))
  }

  if (pathname === '/catalogus' || pathname.startsWith('/catalogus/')) {
    const stripped = pathname.replace(/^\/catalogus/, '') || '/'
    const url = request.nextUrl.clone()
    url.pathname = stripped
    url.search = search
    return finish(NextResponse.redirect(url, 308))
  }

  if (
    isStaticAsset(pathname) ||
    isSiteAccessApi(pathname) ||
    isPricelistApiPath(pathname) ||
    isChatApi(pathname) ||
    isPublicApi(pathname)
  ) {
    return finish(NextResponse.next())
  }

  let required = false
  let allowed = true
  try {
    const fromCookies = await siteAccessFromCookies(request)
    const access = fromCookies ?? (await siteAccessFromApi(request))
    required = access.required
    allowed = access.allowed
  } catch (error) {
    console.error('[middleware] site access check failed:', error)
    required = false
    allowed = true
  }

  if (!required || allowed) {
    const localeResponse = applyLocaleRouting(request)
    return finish(localeResponse ?? NextResponse.next())
  }

  if (pathname === GATE_PATH) {
    return finish(NextResponse.next())
  }

  if (isPricelistSharePath(pathname, request.nextUrl.searchParams.get('owner'))) {
    return finish(NextResponse.next())
  }

  if (pathname.startsWith('/api/')) {
    return finish(
      NextResponse.json({ error: 'Site access password required' }, { status: 401 })
    )
  }

  const gate = request.nextUrl.clone()
  gate.pathname = GATE_PATH
  gate.searchParams.set('from', pathname + search)
  const res = NextResponse.redirect(gate)
  const { locale: fromLocale } = parseLocaleFromPathname(pathname)
  if (fromLocale) {
    res.cookies.set(LOCALE_COOKIE, fromLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }
  return finish(res)
}

export const config = {
  matcher: [
    '/catalogus',
    '/catalogus/:path*',
    '/((?!_next/static|_next/image).*)',
  ],
}
