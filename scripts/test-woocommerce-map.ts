/**
 * WooCommerce import mapping tests.
 * Run: npx tsx scripts/test-woocommerce-map.ts
 */
import assert from 'node:assert/strict'
import {
  decodeWooHtmlEntities,
  parseWooExternalId,
  wooExternalId,
  wooPriceToDecimal,
  type WooStorePrices,
  type WooStoreProduct,
} from '../src/lib/woocommerce/types'
import { mapWooStoreProduct, stripWooHtml } from '../src/lib/woocommerce/map-product'

const prices: WooStorePrices = {
  price: '95000',
  regular_price: '95000',
  sale_price: '95000',
  currency_code: 'EUR',
  currency_minor_unit: 2,
}
assert.deepEqual(wooPriceToDecimal(prices), { price: 950, originalPrice: null })

assert.equal(decodeWooHtmlEntities('GMT&#8211;Master'), 'GMT–Master')
assert.equal(stripWooHtml('<p>Hello <strong>world</strong></p>'), 'Hello world')

assert.equal(wooExternalId(3693), 'wc-3693')
assert.equal(parseWooExternalId('wc-3693'), 3693)
assert.equal(parseWooExternalId('album-1'), null)

const sample: WooStoreProduct = {
  id: 3693,
  name: 'ROLEX GMT&#8211;Master',
  slug: 'rolex-gmt',
  sku: '',
  permalink: 'https://stuntxl.com/product/rolex-gmt/',
  short_description: '<p>Short</p>',
  description: '<p>Long description</p>',
  prices,
  images: [{ id: 1, src: 'https://stuntxl.com/wp-content/uploads/a.jpg' }],
  categories: [{ id: 59, name: 'Dames horloges', slug: 'dames-horloges' }],
  brands: [{ id: 51, name: 'ROLEX', slug: 'rolex' }],
}

const mapped = mapWooStoreProduct(sample)
assert.equal(mapped.externalId, 'wc-3693')
assert.equal(mapped.name, 'ROLEX GMT–Master')
assert.equal(mapped.price, 950)
assert.equal(mapped.brandName, 'ROLEX')
assert.equal(mapped.categoryName, 'Dames horloges')
assert.equal(mapped.sku, 'wc-3693')
assert.deepEqual(mapped.imageUrls, ['https://stuntxl.com/wp-content/uploads/a.jpg'])

import { parseWooProductSlugFromUrl, normalizeWooCommerceStoreUrl } from '../src/lib/woocommerce/client'
assert.equal(
  parseWooProductSlugFromUrl(
    'https://stuntxl.com/product/gmt-master-ii-pepsi-v3-meteorite-gain-weight-195gr/',
    'https://stuntxl.com'
  ),
  'gmt-master-ii-pepsi-v3-meteorite-gain-weight-195gr'
)
assert.equal(
  normalizeWooCommerceStoreUrl(
    'https://stuntxl.com/product/gmt-master-ii-pepsi-v3-meteorite-gain-weight-195gr/'
  ),
  'https://stuntxl.com'
)

import { wooSlugExternalId, parseWooSlugExternalId } from '../src/lib/woocommerce/types'
assert.equal(
  wooSlugExternalId('gmt-master-ii-pepsi-v3-meteorite-gain-weight-195gr'),
  'wc-slug-gmt-master-ii-pepsi-v3-meteorite-gain-weight-195gr'
)
assert.equal(
  parseWooSlugExternalId('wc-slug-gmt-master-ii-pepsi-v3-meteorite-gain-weight-195gr'),
  'gmt-master-ii-pepsi-v3-meteorite-gain-weight-195gr'
)

assert.equal(
  parseWooProductSlugFromUrl(
    'https://stuntxl.com/product/gmt-master-ii-pepsi-v3-meteorite-gain-weight-195gr/?sb_dismiss=callout',
    'https://stuntxl.com'
  ),
  'gmt-master-ii-pepsi-v3-meteorite-gain-weight-195gr'
)

import {
  isWooImportMirrorPath,
  wooImportMirrorPathForIndex,
  wooImportMirrorRelativeDir,
} from '../src/lib/woocommerce/mirror-images'

assert.equal(wooImportMirrorRelativeDir('wc-3693'), 'imports/woocommerce/wc-3693')
assert.equal(
  wooImportMirrorPathForIndex('wc-3693', 1, 'jpg'),
  'https://superclones.cloud/images/imports/woocommerce/wc-3693/001.jpg'
)
assert.equal(isWooImportMirrorPath('/images/imports/woocommerce/wc-3693/001.jpg'), true)
assert.equal(isWooImportMirrorPath('https://stuntxl.com/wp-content/uploads/a.jpg'), false)

console.log('woocommerce-map: all assertions passed')
