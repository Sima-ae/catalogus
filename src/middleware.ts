import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/** Permanent redirect legacy /catalogus URLs to site root. */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (pathname === '/catalogus' || pathname.startsWith('/catalogus/')) {
    const stripped = pathname.replace(/^\/catalogus/, '') || '/'
    const url = request.nextUrl.clone()
    url.pathname = stripped
    url.search = search
    return NextResponse.redirect(url, 308)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/catalogus', '/catalogus/:path*'],
}
