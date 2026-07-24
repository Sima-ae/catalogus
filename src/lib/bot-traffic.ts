/** Known crawler / monitor user-agents (case-insensitive substring match). */
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

/** High-CPU API routes bots must not stampede (catalog + image proxy). */
const BOT_BLOCKED_API_PREFIXES = ['/api/products', '/api/yupoo-image', '/api/categories']

export function isLikelyBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false
  const ua = userAgent.toLowerCase()
  return BOT_UA_SNIPPETS.some((snippet) => ua.includes(snippet))
}

/** Strip optional locale prefix then test junk paths. */
export function isJunkBotPath(pathname: string): boolean {
  let path = pathname.toLowerCase()
  // /en/employer → /employer
  const localeMatch = path.match(/^\/([a-z]{2})(\/|$)/)
  if (localeMatch) {
    path = path.slice(localeMatch[1]!.length + 1) || '/'
    if (!path.startsWith('/')) path = `/${path}`
  }
  return JUNK_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(prefix)
  )
}

/** Catalog/image APIs that should 404 for known bots (site is noindex). */
export function isBotBlockedApiPath(pathname: string): boolean {
  const path = pathname.toLowerCase()
  return BOT_BLOCKED_API_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  )
}
