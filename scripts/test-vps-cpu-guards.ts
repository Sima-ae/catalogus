/**
 * Quick checks for category host map + bot API blocking helpers.
 *   npx tsx scripts/test-vps-cpu-guards.ts
 */
import assert from 'assert'
import {
  parseCategoryHostMap,
  resolveCategoryForHost,
} from '@/lib/category-host-map'
import {
  isBotBlockedApiPath,
  isLikelyBotUserAgent,
  isScrapeTokenMintPath,
} from '@/lib/bot-traffic'
import {
  SCRAPE_KEY_HEADER,
  SCRAPE_TOKEN_HEADER,
  createScrapeAccessToken,
  hasAuthorizedScrapeAccess,
  verifyScrapeAccessToken,
  verifyScrapeBypassKey,
} from '@/lib/scrape-access'

const map = parseCategoryHostMap(
  'watches.superclones.cloud:WATCHES, perfumes.superclones.cloud:PERFUMES'
)
assert.equal(map.length, 2)
assert.equal(resolveCategoryForHost('watches.superclones.cloud', map), 'WATCHES')
assert.equal(resolveCategoryForHost('other.superclones.cloud', map), null)
assert.equal(
  resolveCategoryForHost('perfumes.superclones.cloud:443', map),
  'PERFUMES'
)

assert.equal(isBotBlockedApiPath('/api/products'), true)
assert.equal(isBotBlockedApiPath('/api/products/abc'), true)
assert.equal(isBotBlockedApiPath('/api/yupoo-image'), true)
assert.equal(isBotBlockedApiPath('/api/categories/shop-nav'), true)
assert.equal(isBotBlockedApiPath('/api/health/db'), false)

assert.equal(isLikelyBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1)'), true)
assert.equal(isLikelyBotUserAgent('Mozilla/5.0 (compatible; bingbot/2.0)'), true)
assert.equal(isLikelyBotUserAgent('GPTBot/1.0'), true)
assert.equal(isLikelyBotUserAgent('python-requests/2.31.0'), true)
assert.equal(isLikelyBotUserAgent('curl/8.0.0'), true)
assert.equal(isLikelyBotUserAgent('SomeCustomSpider/1.0'), true)
assert.equal(isLikelyBotUserAgent(''), true)
assert.equal(isLikelyBotUserAgent(null), true)
assert.equal(isLikelyBotUserAgent('Mozilla/5.0 (Macintosh) Chrome/120'), false)

assert.equal(isBotBlockedApiPath('/api/shop/bootstrap'), true)
assert.equal(isBotBlockedApiPath('/api/activity/social-proof'), true)
assert.equal(isScrapeTokenMintPath('/api/internal/scrape-token'), true)
assert.equal(isScrapeTokenMintPath('/api/products'), false)

async function testScrapeAccess() {
  if (!process.env.SITE_ACCESS_COOKIE_SECRET) {
    process.env.SITE_ACCESS_COOKIE_SECRET = 'test-scrape-secret-16chars'
  }

  const issued = await createScrapeAccessToken('user-1', 3600)
  assert.ok(issued)
  assert.ok(issued!.token.includes('.'))
  const verified = await verifyScrapeAccessToken(issued!.token)
  assert.equal(verified?.userId, 'user-1')
  assert.equal(await verifyScrapeAccessToken('bogus.token'), null)

  const tokenHeaders = new Headers({ [SCRAPE_TOKEN_HEADER]: issued!.token })
  assert.equal(await hasAuthorizedScrapeAccess(tokenHeaders), true)
  assert.equal(await hasAuthorizedScrapeAccess(new Headers()), false)

  const prevBypass = process.env.SCRAPE_BYPASS_SECRET
  process.env.SCRAPE_BYPASS_SECRET = 'trusted-scrape-key-16'
  assert.equal(verifyScrapeBypassKey('trusted-scrape-key-16'), true)
  assert.equal(verifyScrapeBypassKey('wrong'), false)
  const keyHeaders = new Headers({ [SCRAPE_KEY_HEADER]: 'trusted-scrape-key-16' })
  assert.equal(await hasAuthorizedScrapeAccess(keyHeaders), true)
  if (prevBypass === undefined) delete process.env.SCRAPE_BYPASS_SECRET
  else process.env.SCRAPE_BYPASS_SECRET = prevBypass
}

void testScrapeAccess()
  .then(() => {
    console.log('vps-cpu-guards ok')
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })