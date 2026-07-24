/** Request header: skip heavy layout bootstrap (categories/translations DB). */
export const CATALOGUS_LIGHT_HEADER = 'x-catalogus-light'

/** Known crawler / monitor / automation user-agents (case-insensitive substring). */
const BOT_UA_SNIPPETS = [
  'googlebot',
  'bingbot',
  'slurp',
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'applebot',
  'semrushbot',
  'ahrefsbot',
  'mj12bot',
  'dotbot',
  'petalbot',
  'bytespider',
  'gptbot',
  'claudebot',
  'ccbot',
  'uptimerobot',
  'pingdom',
  'statuscake',
  'siteauditbot',
  'screaming frog',
  'rogerbot',
  'seznambot',
  'ia_archiver',
  'zoominfobot',
  'dataforseobot',
  'scrapy',
  'python-requests',
  'python-urllib',
  'go-http-client',
  'httpclient',
  'libwww-perl',
  'phantomjs',
  'headlesschrome',
  'puppeteer',
  'playwright',
  'axios/',
  'node-fetch',
  'okhttp',
  'postman',
  'insomnia',
  'curl/',
  'wget/',
  'httpie',
  'masscan',
  'zgrab',
  'nuclei',
]

/** Paths bots hammer that are not part of this app — cheap 404, no locale/DB. */
const JUNK_PATH_PREFIXES = [
  '/employer',
  '/wp-admin',
  '/wp-login',
  '/wordpress',
  '/xmlrpc.php',
  '/.env',
  '/.git',
  '/phpmyadmin',
  '/admin.php',
  '/cgi-bin',
  '/actuator',
  '/vendor/',
  '/laravel',
  '/telescope',
  '/_ignition',
  '/autoload',
  '/composer',
]

/** High-CPU API routes bots must not stampede. */
const BOT_BLOCKED_API_PREFIXES = [
  '/api/products',
  '/api/yupoo-image',
  '/api/categories',
  '/api/activity',
  '/api/shop',
  '/api/brands',
]

export function isLikelyBotUserAgent(userAgent: string | null | undefined): boolean {
  const raw = String(userAgent ?? '').trim()
  if (!raw) return true
  const ua = raw.toLowerCase()
  return BOT_UA_SNIPPETS.some((snippet) => ua.includes(snippet))
}

/** Strip optional locale prefix then test junk paths. */
export function isJunkBotPath(pathname: string): boolean {
  let path = pathname.toLowerCase()
  const localeMatch = path.match(/^\/([a-z]{2})(\/|$)/)
  if (localeMatch) {
    path = path.slice(localeMatch[1]!.length + 1) || '/'
    if (!path.startsWith('/')) path = `/${path}`
  }
  return JUNK_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(prefix)
  )
}

/** Catalog/image/bootstrap APIs that should 404 for known bots (site is noindex). */
export function isBotBlockedApiPath(pathname: string): boolean {
  const path = pathname.toLowerCase()
  return BOT_BLOCKED_API_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  )
}

/**
 * Cheap in-memory IP rate limit for Edge middleware (per isolate).
 * Returns true when the caller should be rejected.
 */
const rateBuckets = new Map<string, { count: number; resetAt: number }>()

export function isRateLimitedIp(
  ip: string | null | undefined,
  limit = 40,
  windowMs = 60_000
): boolean {
  const key = String(ip ?? '').trim() || 'unknown'
  const now = Date.now()
  const hit = rateBuckets.get(key)
  if (!hit || hit.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs })
    // Opportunistic prune to avoid unbounded growth in long-lived isolates.
    if (rateBuckets.size > 5_000) {
      for (const [k, v] of Array.from(rateBuckets.entries())) {
        if (v.resetAt <= now) rateBuckets.delete(k)
      }
    }
    return false
  }
  hit.count += 1
  return hit.count > limit
}
