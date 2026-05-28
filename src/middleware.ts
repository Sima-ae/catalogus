import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

async function siteAccessAllowed(request: NextRequest): Promise<{
  required: boolean
  allowed: boolean
}> {
  const checkUrl = new URL('/api/site-access/check', request.url)
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

  const { required, allowed } = await siteAccessAllowed(request)
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
