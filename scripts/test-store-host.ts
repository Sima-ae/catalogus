#!/usr/bin/env npx tsx
/**
 * Regression: featured-only multi-host helpers (1-1.club storefront).
 */
import assert from 'assert'
import {
  applyHostBrandToBootstrap,
  // re-export check via store-host
} from '@/lib/shop-bootstrap'
import { getDefaultShopBootstrap } from '@/lib/shop-bootstrap-shared'
import {
  isFeaturedOnlyHost,
  parseFeaturedOnlyHosts,
  parseHostSiteBrandMap,
  resolveHostSiteBrand,
  resolveRequestOrigin,
  resolveStoreModeFromHeaders,
  resolveStoreModeFromHost,
} from '@/lib/store-host'
import {
  buildActiveCatalogFilters,
  isCatalogShuffleEligible,
  type CatalogProductsQuery,
} from '@/lib/catalog-products'

process.env.FEATURED_ONLY_HOSTS = 'www.1-1.club,1-1.club'
process.env.HOST_SITE_BRAND =
  'www.1-1.club:1-1 Club|Featured picks,1-1.club:1-1 Club|Featured picks'

assert.deepEqual(parseFeaturedOnlyHosts(), ['www.1-1.club', '1-1.club'])
assert.equal(isFeaturedOnlyHost('www.1-1.club'), true)
assert.equal(isFeaturedOnlyHost('WWW.1-1.CLUB:443'), true)
assert.equal(isFeaturedOnlyHost('superclones.cloud'), false)
assert.equal(resolveStoreModeFromHost('www.1-1.club'), 'featured')
assert.equal(resolveStoreModeFromHost('superclones.cloud'), 'default')

const headers = new Headers()
headers.set('host', 'www.1-1.club')
assert.equal(resolveStoreModeFromHeaders(headers), 'featured')
assert.equal(resolveRequestOrigin(headers), 'https://www.1-1.club')

const brand = resolveHostSiteBrand('www.1-1.club', parseHostSiteBrandMap())
assert.ok(brand)
assert.equal(brand!.site_name, '1-1 Club')
assert.equal(brand!.site_tagline, 'Featured picks')

const bootstrap = applyHostBrandToBootstrap(getDefaultShopBootstrap('nl'), 'www.1-1.club')
assert.equal(bootstrap.site_name, '1-1 Club')

const featuredQuery: CatalogProductsQuery = {
  page: 1,
  limit: 24,
  featuredOnly: true,
  shuffle: true,
}
assert.equal(isCatalogShuffleEligible(featuredQuery), false)
const { whereSql, params } = buildActiveCatalogFilters(featuredQuery)
assert.ok(whereSql.includes('p.featured = 1'))
assert.ok(Array.isArray(params))

console.log('OK: store-host + featured catalog filters')
