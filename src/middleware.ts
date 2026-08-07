import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  SITE_ACCESS_COOKIE,
  SITE_ACCESS_META_REQUIRED,
  SITE_ACCESS_META_VERSION,
  applySiteAccessCookies,
  getCookieSecret,
  peekUnlockTokenVersion,
  verifyUnlockToken,
} from '@/lib/site-access-cookie'

import { isPricelistSharePath, isPricelistApiPath } from '@/lib/pricelist-share-path'
import {
  isPublicProductApiPath,
  isPublicProductPath,
  isPublicShareAssetApiPath,
} from '@/lib/public-product-path'
import {
  LOCALE_COOKIE,
  parseLocaleFromPathname,
} from '@/lib/i18n-routing'
import { resolveLocalePathRouting } from '@/lib/locale-path-routing'
import { applyNoIndexHeaders } from '@/lib/no-index'
import {
  CATALOGUS_LIGHT_HEADER,
  isBotBlockedApiPath,
  isJunkBotPath,
  isLikelyBotUserAgent,
  isRateLimitedIp,
  isScrapeTokenMintPath,
  isSocialPreviewUserAgent,
} from '@/lib/bot-traffic'
import { hasAuthorizedScrapeAccess } from '@/lib/scrape-access'
import { resolveCategoryForHost } from '@/lib/category-host-map'
import {
  CATALOGUS_STORE_FEATURED,
  CATALOGUS_STORE_HEADER,
  isFeaturedOnlyHost,
} from '@/lib/store-host'

const GATE_PATH = '/site-access-gate'
const LOCALE_HEADER = 'x-catalogus-locale'

function withStoreModeHeaders(request: NextRequest, base?: Headers): Headers {
  const headers = new Headers(base ?? request.headers)
  if (isFeaturedOnlyHost(request.nextUrl.hostname)) {
    headers.set(CATALOGUS_STORE_HEADER, CATALOGUS_STORE_FEATURED)
  }
  return headers
}

function nextWithStore(request: NextRequest): NextResponse {
  return NextResponse.next({
    request: { headers: withStoreModeHeaders(request) },
  })
}

function isStaticAsset(pathname: string): boolean {
  if (pathname.startsWith('/_next/static') || pathname.startsWith('/_next/image')) {
    return true
  }
  if (pathname.startsWith('/images/')) {
    return true
  }
  if (pathname === '/favicon.ico' || pathname === '/manifest.webmanifest') return true
  if (pathname.startsWith('/flags/')) return true
  // Brand logos in /public (WEBLOGO-*.png)
  if (/^\/WEBLOGO/i.test(pathname)) return true
  const publicExt = ['.ico', '.png', '.svg', '.webp', '.jpg', '.jpeg', '.gif', '.woff2', '.woff']
  return publicExt.some((ext) => pathname.endsWith(ext))
}

function shouldSkipLocaleRouting(pathname: string): boolean {
  if (pathname.startsWith('/api/')) return true
  const { locale, pathnameWithoutLocale } = parseLocaleFromPathname(pathname)
  // Bare gate stays unprefixed; /{lang}/site-access-gate still needs a rewrite.
  if (
    !locale &&
    (pathnameWithoutLocale === GATE_PATH ||
      pathnameWithoutLocale.startsWith(`${GATE_PATH}/`))
  ) {
    return true
  }
  return false
}

function attachLocaleCookie(response: NextResponse, locale: string): void {
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
}

/** Apply rewrite/redirect from resolveLocalePathRouting (+ optional light layout header). */
function applyResolvedLocaleRouting(
  request: NextRequest,
  options?: { light?: boolean }
): NextResponse {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value
  const resolved = resolveLocalePathRouting(request.nextUrl.pathname, cookieLocale)
  const light = options?.light === true

  if (resolved.action === 'rewrite') {
    const url = request.nextUrl.clone()
    url.pathname = resolved.pathname
    const requestHeaders = withStoreModeHeaders(request)
    requestHeaders.set(LOCALE_HEADER, resolved.locale)
    if (light) requestHeaders.set(CATALOGUS_LIGHT_HEADER, '1')
    const res = NextResponse.rewrite(url, { request: { headers: requestHeaders } })
    attachLocaleCookie(res, resolved.locale)
    return res
  }

  const url = request.nextUrl.clone()
  url.pathname = resolved.pathname
  url.search = request.nextUrl.search
  const res = NextResponse.redirect(url)
  attachLocaleCookie(res, resolved.locale)
  return res
}

/** Prefix URLs with locale slug (/en/...) and rewrite internally without the prefix. */
function applyLocaleRouting(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl
  if (shouldSkipLocaleRouting(pathname)) return null
  return applyResolvedLocaleRouting(request)
}

function withLightHeader(request: NextRequest): NextResponse {
  const requestHeaders = withStoreModeHeaders(request)
  requestHeaders.set(CATALOGUS_LIGHT_HEADER, '1')
  return NextResponse.next({ request: { headers: requestHeaders } })
}

/**
 * Locked share pages (product / pricelist) still need the same locale rewrite as
 * unlocked traffic — plain next() on /nl/product/:id 404s (no app/nl/… routes).
 * Bare /product/:id redirects to /{locale}/product/:id for every language.
 */
function withLightLocaleRouting(request: NextRequest): NextResponse {
  return applyResolvedLocaleRouting(request, { light: true })
}

function isSiteAccessApi(pathname: string): boolean {
  return pathname.startsWith('/api/site-access/')
}

function isChatApi(pathname: string): boolean {
  return pathname.startsWith('/api/chat/')
}

function isPublicApi(pathname: string): boolean {
  return pathname === '/api/health/db'
}

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  )
}

/**
 * Edge-only site access — NEVER self-fetches /api/site-access/check (that doubled every
 * cookieless probe into a Node+MariaDB hit and was the main idle-CPU burn).
 */
async function resolveSiteAccess(request: NextRequest): Promise<{
  required: boolean
  allowed: boolean
  version: number
  setMeta: boolean
}> {
  const requiredFlag = request.cookies.get(SITE_ACCESS_META_REQUIRED)?.value
  if (requiredFlag === '0') {
    return { required: false, allowed: true, version: 0, setMeta: false }
  }

  const metaVersion =
    Number.parseInt(request.cookies.get(SITE_ACCESS_META_VERSION)?.value || '', 10) || 0
  const unlock = request.cookies.get(SITE_ACCESS_COOKIE)?.value
  const secretOk = Boolean(getCookieSecret())

  if (requiredFlag === '1') {
    if (!secretOk || !unlock) {
      return { required: true, allowed: false, version: metaVersion, setMeta: false }
    }
    const allowed = await verifyUnlockToken(unlock, metaVersion)
    return { required: true, allowed, version: metaVersion, setMeta: false }
  }

  // No meta cookie yet. Prefer unlock token (version is embedded) — still no DB.
  if (unlock && secretOk) {
    const version = peekUnlockTokenVersion(unlock) ?? 0
    const allowed = await verifyUnlockToken(unlock, version)
    return { required: true, allowed, version, setMeta: true }
  }

  // Locked by default until the gate (or status API) sets meta cookies.
  // Gate page is the only place that may hit MariaDB for site-access config.
  return { required: true, allowed: false, version: 0, setMeta: false }
}

function attachSiteAccessMeta(
  response: NextResponse,
  meta: { required: boolean; version: number }
): NextResponse {
  applySiteAccessCookies(response, {
    required: meta.required,
    version: meta.version,
  })
  return response
}

/** Permanent redirect legacy /catalogus URLs. Enforce site-wide access without DB self-fetch. */
export async function middleware(request: NextRequest) {
  const finish = (response: NextResponse) => applyNoIndexHeaders(response)

  const { pathname, search } = request.nextUrl
  const ua = request.headers.get('user-agent')
  const isBot = isLikelyBotUserAgent(ua)
  // Only verify scrape tokens for bot/automation UAs — humans never send them.
  const scrapeAuthorized = isBot
    ? await hasAuthorizedScrapeAccess(request.headers)
    : false

  if (isJunkBotPath(pathname)) {
    return finish(
      new NextResponse(null, {
        status: 404,
        headers: { 'Cache-Control': 'public, max-age=86400' },
      })
    )
  }

  // Static logos + /images/** MUST bypass bot checks. Next.js Image optimizer
  // fetches them with an Undici/Node UA; blocking that returned HTTP 404 and
  // broke BrandLogo + catalog photos ("The requested resource isn't a valid image").
  if (isStaticAsset(pathname)) {
    return finish(NextResponse.next())
  }

  // Health only — never run locale/gate/bootstrap for monitors.
  if (isPublicApi(pathname)) {
    return finish(NextResponse.next())
  }

  // Own apps: mint a scrape token with super-admin password (rate-limited).
  if (isScrapeTokenMintPath(pathname)) {
    if (isRateLimitedIp(`mint:${clientIp(request)}`, 10, 60_000)) {
      return finish(
        new NextResponse(null, {
          status: 429,
          headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
        })
      )
    }
    return finish(NextResponse.next())
  }

  // Third-party scrapers + search crawlers: permanent cheap 404 (no HTML, no APIs).
  // Only our apps with a valid scrape token / SCRAPE_BYPASS_SECRET may automate.
  // Exception: social preview bots may fetch product share pages + OG image proxy
  // (Facebook/WhatsApp/etc. fetch og:image separately after reading the HTML).
  if (isBot && !scrapeAuthorized) {
    const socialPreview =
      isSocialPreviewUserAgent(ua) &&
      (isPublicProductPath(pathname) ||
        (pathname.replace(/\/$/, '') || '/') === '/api/yupoo-image')
    if (socialPreview) {
      // Fall through to locale/gate handling below (product path bypass when locked).
    } else {
      return finish(
        new NextResponse(null, {
          status: 404,
          headers: { 'Cache-Control': 'public, max-age=3600' },
        })
      )
    }
  }

  // Authorized own-app scrapers skip the human site-access gate.
  if (scrapeAuthorized) {
    if (pathname.startsWith('/api/')) {
      return finish(nextWithStore(request))
    }
    const localeResponse = applyLocaleRouting(request)
    return finish(localeResponse ?? nextWithStore(request))
  }

  const hasMeta = Boolean(request.cookies.get(SITE_ACCESS_META_REQUIRED)?.value)
  const hasUnlock = Boolean(request.cookies.get(SITE_ACCESS_COOKIE)?.value)

  // Hot catalog APIs for unlocked shoppers: verify unlock once (memoized HMAC),
  // then skip locale/gate/bootstrap work. Forged cookies still fail verify.
  if (hasUnlock && pathname.startsWith('/api/')) {
    const unlock = request.cookies.get(SITE_ACCESS_COOKIE)?.value
    const metaVersion =
      Number.parseInt(request.cookies.get(SITE_ACCESS_META_VERSION)?.value || '', 10) ||
      peekUnlockTokenVersion(unlock) ||
      0
    if (unlock && (await verifyUnlockToken(unlock, metaVersion))) {
      return finish(nextWithStore(request))
    }
  }

  // Heavy catalog APIs: only rate-limit anonymous / locked traffic.
  // Unlocked shoppers load product grids + many /api/yupoo-image calls — a flat
  // 60/min cap was returning HTTP 429 on category clicks (e.g. Kleding).
  // Bots without a scrape token already got 404 above.
  // Public share PDP assets (yupoo-image / catalog-mode) stay uncapped so a
  // locked visitor’s gallery is not mistaken for “no image”.
  if (
    isBotBlockedApiPath(pathname) &&
    !hasUnlock &&
    !isPublicShareAssetApiPath(pathname) &&
    isRateLimitedIp(`anon-api:${clientIp(request)}`, 40, 60_000)
  ) {
    return finish(
      new NextResponse(null, {
        status: 429,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
      })
    )
  }

  // Optional marketing hosts: watches.example.com → ?category=WATCHES when unset.
  // Featured-only hosts (1-1.club) skip category injection — catalog is featured set.
  const hostCategory = isFeaturedOnlyHost(request.nextUrl.hostname)
    ? null
    : resolveCategoryForHost(request.nextUrl.hostname)
  if (
    hostCategory &&
    !shouldSkipLocaleRouting(pathname) &&
    !request.nextUrl.searchParams.get('category')
  ) {
    const { locale: pathLocale, pathnameWithoutLocale } = parseLocaleFromPathname(pathname)
    if (
      pathnameWithoutLocale === '/' ||
      pathnameWithoutLocale === '/new' ||
      pathnameWithoutLocale === '/pricelist'
    ) {
      const url = request.nextUrl.clone()
      url.searchParams.set('category', hostCategory)
      if (pathLocale) {
        url.pathname = pathname
      }
      return finish(NextResponse.redirect(url, 307))
    }
  }

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
    isSiteAccessApi(pathname) ||
    isPricelistApiPath(pathname) ||
    isPublicProductApiPath(pathname) ||
    isPublicShareAssetApiPath(pathname) ||
    isChatApi(pathname)
  ) {
    return finish(nextWithStore(request))
  }

  // Cookieless scrapers pretending to be browsers — hard cap.
  // Social preview crawlers on product share URLs are allowed (OG metadata).
  if (
    !hasMeta &&
    !hasUnlock &&
    !(isSocialPreviewUserAgent(ua) && isPublicProductPath(pathname)) &&
    isRateLimitedIp(`anon:${clientIp(request)}`, 20, 60_000)
  ) {
    return finish(
      new NextResponse(null, {
        status: 429,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
      })
    )
  }

  const access = await resolveSiteAccess(request)

  const withMeta = (response: NextResponse) => {
    if (access.setMeta) {
      return attachSiteAccessMeta(response, {
        required: access.required,
        version: access.version,
      })
    }
    return response
  }

  const { pathnameWithoutLocale } = parseLocaleFromPathname(pathname)
  const onGate =
    pathnameWithoutLocale === GATE_PATH ||
    pathnameWithoutLocale.startsWith(`${GATE_PATH}/`)

  // Gate + locked traffic: skip heavy category/translation bootstrap in layout.
  if (onGate || (access.required && !access.allowed)) {
    if (onGate) {
      // Locale-prefixed gate (/nl/site-access-gate) must rewrite like other pages.
      const { locale: gateLocale } = parseLocaleFromPathname(pathname)
      if (gateLocale) {
        return finish(withMeta(withLightLocaleRouting(request)))
      }
      return finish(withMeta(withLightHeader(request)))
    }

    if (pathname.startsWith('/api/')) {
      return finish(
        withMeta(
          NextResponse.json({ error: 'Site access password required' }, { status: 401 })
        )
      )
    }

    if (isPricelistSharePath(pathname, request.nextUrl.searchParams.get('owner'))) {
      return finish(withMeta(withLightLocaleRouting(request)))
    }

    if (isPublicProductPath(pathname)) {
      return finish(withMeta(withLightLocaleRouting(request)))
    }

    const gate = request.nextUrl.clone()
    gate.pathname = GATE_PATH
    gate.searchParams.set('from', pathname + search)
    const res = withMeta(NextResponse.redirect(gate))
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

  if (!access.required || access.allowed) {
    const localeResponse = applyLocaleRouting(request)
    return finish(withMeta(localeResponse ?? nextWithStore(request)))
  }

  return finish(withMeta(nextWithStore(request)))
}

export const config = {
  matcher: [
    '/catalogus',
    '/catalogus/:path*',
    '/((?!_next/static|_next/image).*)',
  ],
}
