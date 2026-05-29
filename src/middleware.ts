import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  SITE_ACCESS_COOKIE,
  SITE_ACCESS_META_REQUIRED,
  SITE_ACCESS_META_VERSION,
  verifyUnlockToken,
} from '@/lib/site-access-cookie'

const GATE_PATH = '/site-access-gate'

function isStaticAsset(pathname: string): boolean {
  if (pathname.startsWith('/_next/static') || pathname.startsWith('/_next/image')) {
    return true
  }
  if (pathname === '/favicon.ico') return true
  const publicExt = ['.ico', '.png', '.svg', '.webp', '.jpg', '.jpeg', '.gif', '.woff2', '.woff']
  return publicExt.some((ext) => pathname.endsWith(ext))
}

function isSiteAccessApi(pathname: string): boolean {
  return pathname.startsWith('/api/site-access/')
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

  const version =
    Number.parseInt(request.cookies.get(SITE_ACCESS_META_VERSION)?.value || '0', 10) || 0
  const token = request.cookies.get(SITE_ACCESS_COOKIE)?.value
  return {
    required: true,
    allowed: await verifyUnlockToken(token, version),
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
  const { pathname, search } = request.nextUrl

  if (pathname === '/catalogus' || pathname.startsWith('/catalogus/')) {
    const stripped = pathname.replace(/^\/catalogus/, '') || '/'
    const url = request.nextUrl.clone()
    url.pathname = stripped
    url.search = search
    return NextResponse.redirect(url, 308)
  }

  if (isStaticAsset(pathname) || isSiteAccessApi(pathname)) {
    return NextResponse.next()
  }

  const fromCookies = await siteAccessFromCookies(request)
  const { required, allowed } = fromCookies ?? (await siteAccessFromApi(request))

  if (!required || allowed) {
    return NextResponse.next()
  }

  if (pathname === GATE_PATH) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Site access password required' },
      { status: 401 }
    )
  }

  const gate = request.nextUrl.clone()
  gate.pathname = GATE_PATH
  gate.searchParams.set('from', pathname + search)
  return NextResponse.redirect(gate)
}

export const config = {
  matcher: [
    '/catalogus',
    '/catalogus/:path*',
    '/((?!_next/static|_next/image).*)',
  ],
}
