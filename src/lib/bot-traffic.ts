/**
 * Detect and cheaply reject crawlers / scrapers / search-engine bots.
 * Authorized own-app traffic uses scrape tokens (see scrape-access.ts).
 */
export const CATALOGUS_LIGHT_HEADER = 'x-catalogus-light'

/** Known crawler / monitor / automation user-agents (case-insensitive substring). */
const BOT_UA_SNIPPETS = [
  // Search engines
  'googlebot',
  'google-extended',
  'googleother',
  'storebot-google',
  'apis-google',
  'adsbot-google',
  'mediapartners-google',
  'feedfetcher-google',
  'bingbot',
  'bingpreview',
  'adidxbot',
  'msnbot',
  'slurp',
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'yandex.com/bots',
  'sogou',
  'exabot',
  'seznambot',
  'qwantify',
  'applebot',
  'petalbot',
  'bytespider',
  'coccocbot',
  'ia_archiver',
  'archive.org_bot',
  'wayback',
  // Social / preview
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'linkedinbot',
  'pinterest',
  'slackbot',
  'discordbot',
  'telegrambot',
  'whatsapp',
  'vkshare',
  'embedly',
  'quora link preview',
  // SEO / commercial crawlers
  'semrushbot',
  'ahrefsbot',
  'mj12bot',
  'dotbot',
  'rogerbot',
  'screaming frog',
  'siteauditbot',
  'zoominfobot',
  'dataforseobot',
  'serpstatbot',
  'majestic',
  'blexbot',
  'linkdexbot',
  'spbot',
  'seokicks',
  'seekport',
  // AI scrapers
  'gptbot',
  'chatgpt-user',
  'oai-searchbot',
  'claudebot',
  'anthropic-ai',
  'ccbot',
  'bytespider',
  'amazonbot',
  'meta-externalagent',
  'cohere-ai',
  'perplexitybot',
  'youbot',
  'diffbot',
  // Monitors / scanners
  'uptimerobot',
  'pingdom',
  'statuscake',
  'newrelicpinger',
  'site24x7',
  'datadog',
  'masscan',
  'zgrab',
  'nuclei',
  'nikto',
  'sqlmap',
  'nmap',
  'nessus',
  // Libraries / automation / scrapers
  'scrapy',
  'python-requests',
  'python-urllib',
  'python-httpx',
  'aiohttp',
  'go-http-client',
  'httpclient',
  'libwww-perl',
  'java/',
  'apache-httpclient',
  'phantomjs',
  'headlesschrome',
  'puppeteer',
  'playwright',
  'selenium',
  'webdriver',
  'axios/',
  'node-fetch',
  'undici',
  'okhttp',
  'postman',
  'insomnia',
  'httpie',
  'curl/',
  'wget/',
  'libcurl',
  'rest-client',
  'faraday',
  'scrapy',
  'mechanize',
  'beautifulsoup',
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
  '/sitemap.xml',
  '/sitemap',
  '/feed',
  '/rss',
  '/.well-known/security.txt',
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

/**
 * Generic bot/spider/crawler/scraper tokens (word-ish).
 * Avoids matching normal browser UAs while catching unnamed crawlers.
 */
const GENERIC_BOT_RE =
  /(?:^|[^a-z0-9])(?:[a-z0-9_-]*(?:bot|spider|crawler|scraper|crawling)[a-z0-9_-]*|crawl)(?:[^a-z0-9]|$)/i

export function isLikelyBotUserAgent(userAgent: string | null | undefined): boolean {
  const raw = String(userAgent ?? '').trim()
  if (!raw) return true
  const ua = raw.toLowerCase()
  if (BOT_UA_SNIPPETS.some((snippet) => ua.includes(snippet))) return true
  if (GENERIC_BOT_RE.test(ua)) return true
  return false
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

/** Mint scrape tokens without prior token (chicken-and-egg for own apps). */
export function isScrapeTokenMintPath(pathname: string): boolean {
  return pathname === '/api/internal/scrape-token'
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
