/**
 * WeCatalog import mapping tests.
 * Run: npm run test:wecatalog-map
 */
import assert from 'node:assert/strict'
import { parseWecatalogListUrl, normalizeWecatalogListUrl } from '../src/lib/wecatalog/client'
import {
  collectWecatalogImageUrls,
  detectBrandFromTitle,
  mapWecatalogProduct,
  normalizeWecatalogImageUrl,
  parseWecatalogPrice,
  purchasePriceFromCommodity,
  splitWecatalogTitleAndDescription,
} from '../src/lib/wecatalog/map-product'
import {
  parseWecatalogExternalId,
  parseWecatalogGoodsIdFromUrl,
  wecatalogExternalId,
  wecatalogProductPermalink,
} from '../src/lib/wecatalog/types'
import { wecatalogListItemsToJobItems } from '../src/lib/wecatalog/discover-list'

const sampleListUrl =
  'https://a201901211613577250159120.wecatalog.cn/weshop/goods_list/_dQUqffW0AGRsHhChrutZ0UxZaRz5jduVJ7yE1vg?groupId=76810891'

assert.equal(
  normalizeWecatalogListUrl(sampleListUrl),
  sampleListUrl
)

const parsed = parseWecatalogListUrl(sampleListUrl)
assert.equal(parsed.shopId, '_dQUqffW0AGRsHhChrutZ0UxZaRz5jduVJ7yE1vg')
assert.equal(parsed.groupId, '76810891')
assert.equal(parsed.currTab, 'all')
assert.ok(parsed.listRefererUrl.includes('groupId=76810891'))

assert.equal(wecatalogExternalId('_abc123'), 'wecatalog-_abc123')
assert.equal(parseWecatalogExternalId('wecatalog-_abc123'), '_abc123')
assert.equal(parseWecatalogExternalId('lkxox-17'), null)

assert.deepEqual(
  parseWecatalogGoodsIdFromUrl(
    'https://tenant.wecatalog.cn/weshop/product/SHOP/GOODS123'
  ),
  { shopId: 'SHOP', goodsId: 'GOODS123' }
)

assert.equal(
  wecatalogProductPermalink('https://tenant.wecatalog.cn', 'SHOP', 'GOODS123'),
  'https://tenant.wecatalog.cn/weshop/product/SHOP/GOODS123'
)

assert.equal(
  normalizeWecatalogImageUrl(
    'https://xcimg.szwego.com/img/a.jpg?imageMogr2/auto-orient/thumbnail/!320x320r'
  ),
  'https://xcimg.szwego.com/img/a.jpg'
)

assert.equal(parseWecatalogPrice('¥ 1,250.00'), 1250)
assert.equal(parseWecatalogPrice(''), null)
assert.equal(purchasePriceFromCommodity({ itemPrice: '99' }), 99)
assert.equal(
  purchasePriceFromCommodity({ skuPriceMap: { default: '150' } }),
  150
)

const split = splitWecatalogTitleAndDescription('Mini Evelyne bag\nTC leather\nGold hardware')
assert.equal(split.name, 'Mini Evelyne bag')
assert.equal(split.description, 'TC leather\nGold hardware')

assert.equal(
  detectBrandFromTitle('HERMES Mini Evelyne', ['GUCCI', 'HERMES', 'LOUIS VUITTON']),
  'HERMES'
)

const commodity = {
  goods_id: 'GOODS123',
  title: 'LOUIS VUITTON Speedy\nMonogram canvas',
  goodsNum: 'LV-001',
  imgsSrc: [
    'https://xcimg.szwego.com/img/a.jpg?thumb=1',
    'https://xcimg.szwego.com/img/b.jpg?thumb=1',
  ],
}

assert.deepEqual(collectWecatalogImageUrls(commodity), [
  'https://xcimg.szwego.com/img/a.jpg',
  'https://xcimg.szwego.com/img/b.jpg',
])

const mapped = mapWecatalogProduct({
  shopId: 'SHOP',
  goodsId: 'GOODS123',
  permalink: 'https://tenant.wecatalog.cn/weshop/product/SHOP/GOODS123',
  commodity,
  brandName: 'LOUIS VUITTON',
})
assert.equal(mapped.externalId, 'wecatalog-GOODS123')
assert.equal(mapped.sku, 'LV-001')
assert.equal(mapped.price, 0)
assert.equal(mapped.brandName, 'LOUIS VUITTON')
assert.equal(mapped.imageUrls.length, 2)

const jobItems = wecatalogListItemsToJobItems([
  {
    goodsId: 'GOODS123',
    externalId: 'wecatalog-GOODS123',
    permalink: 'https://tenant.wecatalog.cn/weshop/product/SHOP/GOODS123',
    title: 'Sample',
    shopId: 'SHOP',
  },
])
assert.equal(jobItems[0].externalId, 'wecatalog-GOODS123')

console.log('All WeCatalog import tests passed.')
