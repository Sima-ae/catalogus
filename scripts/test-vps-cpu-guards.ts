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
} from '@/lib/bot-traffic'

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
assert.equal(isLikelyBotUserAgent('python-requests/2.31.0'), true)
assert.equal(isLikelyBotUserAgent('Mozilla/5.0 (Macintosh) Chrome/120'), false)

console.log('vps-cpu-guards ok')
