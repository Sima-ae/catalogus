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
assert.equal(bootstrap.footer_copyright, '1-1 Club © {year}')

const withDbBrand = applyHostBrandToBootstrap(
  getDefaultShopBootstrap('nl'),
  'www.1-1.club',
  {
    featured_site_name: 'Club One',
    featured_site_tagline: 'Picks',
    featured_homepage_title: 'Club One Home',
    featured_footer_menu: 'Line A\nLine B',
    featured_footer_copyright: 'Club One © {year}',
    featured_logo_path: '/images/brand/featured/default.png',
    featured_logo_path_white: '',
  }
)
assert.equal(withDbBrand.site_name, 'Club One')
assert.equal(withDbBrand.site_tagline, 'Picks')
assert.equal(withDbBrand.footer_menu, 'Line A\nLine B')
assert.equal(withDbBrand.logo_path, '/images/brand/featured/default.png')
assert.equal(withDbBrand.logo_path_white, '/images/brand/featured/default.png')

const featuredQuery: CatalogProductsQuery = {
  page: 1,
  limit: 24,
  featuredOnly: true,
  shuffle: true,
}
assert.equal(isCatalogShuffleEligible(featuredQuery), true)
const { whereSql, params } = buildActiveCatalogFilters(featuredQuery)
assert.ok(whereSql.includes('p.featured = 1'))
assert.ok(Array.isArray(params))

console.log('OK: store-host + featured catalog filters')
