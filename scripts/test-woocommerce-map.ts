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
import {
  mapWooStoreProduct,
  stripWooHtml,
  wooBrandFromAttributes,
  wooDescriptionFromAttributes,
} from '../src/lib/woocommerce/map-product'
import { buildProductInputFromWooCommerceImport } from '../src/lib/import-db'
import { mergeRefreshProductPricing } from '../src/lib/import-refresh-pricing'
import {
  catalogCardImageSrc,
  resolveProductDisplayImages,
} from '../src/lib/product-image-url'
import {
  adminListDisplaySalePrice,
  getShopProductOptions,
  stripProductOptionsInternalPricing,
} from '../src/lib/product-options'
import { omitProductInternalPricing } from '../src/lib/product-serialize'
import { normalizeWooCommercePriceMode } from '../src/lib/woocommerce/types'

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

const arFactoryPrices: WooStorePrices = {
  price: '85000',
  regular_price: '90000',
  sale_price: '85000',
  currency_code: 'USD',
  currency_minor_unit: 2,
  price_range: { min_amount: '85000', max_amount: '165000' },
}
assert.deepEqual(wooPriceToDecimal(arFactoryPrices), { price: 850, originalPrice: 900 })

const arFactoryAttributes = [
  {
    id: 3,
    name: 'Brand',
    taxonomy: 'pa_brand',
    has_variations: false,
    terms: [{ id: 122, name: 'Rolex', slug: 'rolex' }],
  },
  {
    id: 0,
    name: 'Model',
    taxonomy: null,
    has_variations: false,
    terms: [{ id: 0, name: 'Day-Date', slug: 'Day-Date' }],
  },
  {
    id: 5,
    name: 'Mechanism',
    taxonomy: 'pa_mechanism',
    has_variations: true,
    terms: [
      { id: 76, name: 'Japanese', slug: 'japanese' },
      { id: 77, name: 'Swiss', slug: 'swiss' },
    ],
  },
]
assert.equal(wooBrandFromAttributes(arFactoryAttributes), 'Rolex')
assert.match(wooDescriptionFromAttributes(arFactoryAttributes), /Brand: Rolex/)
assert.match(wooDescriptionFromAttributes(arFactoryAttributes), /Mechanism: Japanese, Swiss/)

const arFactorySample: WooStoreProduct = {
  id: 157948,
  name: 'Rolex Day-Date 228238-0007 Replica',
  slug: 'rolex-day-date-228238-0007-replica',
  sku: '228235-1-1',
  permalink: 'https://www.arfactorywatch.com/watch/rolex-day-date-228238-0007-replica/',
  short_description: '',
  description: '',
  prices: arFactoryPrices,
  images: [
    {
      id: 157949,
      src: 'https://www.arfactorywatch.com/wp-content/uploads/2025/09/rolex-day-date.jpg.webp',
    },
  ],
  categories: [
    {
      id: 127,
      name: 'Day Date',
      slug: 'day-date',
      link: 'https://www.arfactorywatch.com/replica/rolex/day-date/',
    },
    {
      id: 120,
      name: 'Rolex',
      slug: 'rolex',
      link: 'https://www.arfactorywatch.com/replica/rolex/',
    },
  ],
  brands: [],
  attributes: arFactoryAttributes,
}

const arMapped = mapWooStoreProduct(arFactorySample)
assert.equal(arMapped.externalId, 'wc-157948')
assert.equal(arMapped.brandName, 'Rolex')
assert.equal(arMapped.categoryName, 'Rolex')
assert.equal(arMapped.sku, '228235-1-1')
assert.equal(arMapped.price, 850)
assert.match(arMapped.description, /Brand: Rolex/)

import { mapWooVariationsToProductOptions } from '../src/lib/woocommerce/variations'

const arVariations: WooStoreProduct[] = [
  {
    id: 157964,
    name: 'Rolex Day-Date 228238-0007 Replica',
    slug: 'rolex-day-date-228238-0007-replica',
    sku: '228235-1-1',
    permalink: 'https://www.arfactorywatch.com/watch/rolex-day-date-228238-0007-replica/?attribute_pa_mechanism=japanese',
    short_description: '',
    description: '',
    type: 'variation',
    parent: 157948,
    variation: 'Mechanism: Japanese',
    prices: {
      price: '85000',
      regular_price: '90000',
      sale_price: '85000',
      currency_code: 'USD',
      currency_minor_unit: 2,
    },
    images: [],
    categories: [],
    brands: [],
  },
  {
    id: 157966,
    name: 'Rolex Day-Date 228238-0007 Replica',
    slug: 'rolex-day-date-228238-0007-replica-2',
    sku: '228235-1-1',
    permalink: 'https://www.arfactorywatch.com/watch/rolex-day-date-228238-0007-replica/?attribute_pa_mechanism=swiss',
    short_description: '',
    description: '',
    type: 'variation',
    parent: 157948,
    variation: 'Mechanism: Swiss',
    prices: {
      price: '165000',
      regular_price: '180000',
      sale_price: '165000',
      currency_code: 'USD',
      currency_minor_unit: 2,
    },
    images: [],
    categories: [],
    brands: [],
  },
]

const arOptions = mapWooVariationsToProductOptions(arFactorySample, arVariations, 'purchase_price')
assert.ok(arOptions)
assert.equal(arOptions![0].name, 'Mechanism')
assert.equal(arOptions![0].values.length, 2)
assert.equal(arOptions![0].values[0].label, 'Japanese')
assert.equal(arOptions![0].values[0].price, 0)
assert.equal(arOptions![0].values[0].purchase_price, 850)
assert.equal(arOptions![0].values[1].label, 'Swiss')
assert.equal(arOptions![0].values[1].price, 0)
assert.equal(arOptions![0].values[1].purchase_price, 1650)

const yupooResolved = resolveProductDisplayImages(
  'https://photo.yupoo.com/test/album/medium.jpg',
  null,
  'https://x.yupoo.com/albums/123'
)
const proxyMain = yupooResolved.main
assert.ok(proxyMain.includes('/api/yupoo-image'))
assert.ok(proxyMain.includes('url='))
const cardFromProxy = catalogCardImageSrc(proxyMain, 'https://x.yupoo.com/albums/123')
assert.ok(cardFromProxy.includes('/api/yupoo-image'))
assert.ok(cardFromProxy.includes('url='))
assert.notEqual(cardFromProxy, '/api/yupoo-image')

const arShopOptions = getShopProductOptions(arOptions)
assert.ok(arShopOptions)
assert.equal(arShopOptions![0].values.length, 2)
assert.equal(arShopOptions![0].values[0].label, 'Japanese')

const partialMarginOptions = [
  {
    name: 'Mechanism',
    slug: 'mechanism',
    values: [
      { label: 'Japanese', slug: 'japanese', price: 0, purchase_price: 850 },
      { label: 'Swiss', slug: 'swiss', price: 1650, original_price: null },
    ],
  },
]
const partialShop = getShopProductOptions(partialMarginOptions)
assert.equal(partialShop![0].values.length, 1)
assert.equal(partialShop![0].values[0].label, 'Swiss')

const refreshMerged = mergeRefreshProductPricing(
  {
    price: 1899,
    original_price: null,
    purchase_price: 850,
    product_options: partialMarginOptions,
  },
  {
    price: 0,
    original_price: null,
    purchase_price: 850,
    product_options: [
      {
        name: 'Mechanism',
        slug: 'mechanism',
        values: [
          { label: 'Japanese', slug: 'japanese', price: 0, purchase_price: 850 },
          { label: 'Swiss', slug: 'swiss', price: 0, purchase_price: 1650 },
        ],
      },
    ],
  }
)
assert.equal(refreshMerged.price, 1899)
assert.equal(refreshMerged.product_options![0].values[1].price, 1650)
assert.equal(refreshMerged.product_options![0].values[1].purchase_price, 1650)

const refreshPurchaseBump = mergeRefreshProductPricing(
  {
    price: 999,
    purchase_price: 850,
    product_options: [
      {
        name: 'Mechanism',
        values: [{ label: 'Japanese', price: 999, purchase_price: 850 }],
      },
    ],
  },
  {
    price: 0,
    purchase_price: 900,
    product_options: [
      {
        name: 'Mechanism',
        values: [{ label: 'Japanese', price: 0, purchase_price: 900 }],
      },
    ],
  }
)
assert.equal(refreshPurchaseBump.price, 999)
assert.equal(refreshPurchaseBump.product_options![0].values[0].price, 999)
assert.equal(refreshPurchaseBump.product_options![0].values[0].purchase_price, 900)

assert.equal(adminListDisplaySalePrice(0, partialMarginOptions), 1650)
assert.equal(adminListDisplaySalePrice(0, arOptions), 0)
assert.equal(
  adminListDisplaySalePrice(
    0,
    [
      {
        name: 'Mechanism',
        values: [
          { label: 'Japanese', price: 850 },
          { label: 'Swiss', price: 1650 },
        ],
      },
    ]
  ),
  1650
)

const publicOptions = stripProductOptionsInternalPricing(arOptions)
assert.equal(publicOptions![0].values[0].purchase_price, undefined)
assert.equal(publicOptions![0].values[0].price, 0)

const publicProduct = omitProductInternalPricing({
  price: 100,
  purchase_price: 50,
  shipping_cost: 5,
  product_options: arOptions,
})
assert.ok(!('purchase_price' in publicProduct))
assert.ok(!('shipping_cost' in publicProduct))
assert.equal(publicProduct.product_options![0].values[0].purchase_price, undefined)

assert.equal(normalizeWooCommercePriceMode('purchase_price'), 'purchase_price')
assert.equal(normalizeWooCommercePriceMode('storefront'), 'storefront')
assert.equal(normalizeWooCommercePriceMode(null), 'purchase_price')

import { resolveWooCommercePriceModeForSource } from '../src/lib/woocommerce/price-mode'
assert.equal(
  resolveWooCommercePriceModeForSource({
    woocommerce_store_url: 'https://otwatches.com',
    woocommerce_price_mode: 'storefront',
  }),
  'purchase_price'
)
assert.equal(
  resolveWooCommercePriceModeForSource({
    woocommerce_store_url: 'https://stuntxl.com',
    woocommerce_price_mode: 'storefront',
  }),
  'storefront'
)
assert.equal(
  resolveWooCommercePriceModeForSource({
    woocommerce_store_url: 'https://stuntxl.com',
    woocommerce_price_mode: null,
  }),
  'purchase_price'
)

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
  '/images/imports/woocommerce/wc-3693/001.jpg'
)
assert.equal(isWooImportMirrorPath('/images/imports/woocommerce/wc-3693/001.jpg'), true)
assert.equal(isWooImportMirrorPath('https://stuntxl.com/wp-content/uploads/a.jpg'), false)

async function runPurchasePriceTests() {
  const storefrontInput = await buildProductInputFromWooCommerceImport(
    arMapped,
    { categoryName: 'HORLOGES', categoryId: 'cat-1', brandName: 'Rolex' },
    'storefront'
  )
  assert.equal(storefrontInput.price, 850)
  assert.equal(storefrontInput.original_price, 900)
  assert.equal(storefrontInput.purchase_price, undefined)

  const purchaseInput = await buildProductInputFromWooCommerceImport(
    arMapped,
    { categoryName: 'HORLOGES', categoryId: 'cat-1', brandName: 'Rolex' },
    'purchase_price'
  )
  assert.equal(purchaseInput.price, 0)
  assert.equal(purchaseInput.original_price, null)
  assert.equal(purchaseInput.purchase_price, 850)
}

runPurchasePriceTests()
  .then(() => {
    console.log('woocommerce-map: all assertions passed')
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
