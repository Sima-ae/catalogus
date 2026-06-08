/**
 * Lkxox import mapping tests.
 * Run: npm run test:lkxox-map
 */
import assert from 'node:assert/strict'
import {
  lkxoxExternalId,
  lkxoxPriceToDecimal,
  parseLkxoxExternalId,
  parseLkxoxProductIdFromUrl,
} from '../src/lib/lkxox/types'
import { mapLkxoxProduct, mapLkxoxPrices } from '../src/lib/lkxox/map-product'
import {
  lkxoxListingPageUrl,
  normalizeLkxoxListUrl,
} from '../src/lib/lkxox/client'
import {
  parseLkxoxListingPage,
  parseLkxoxListingSummary,
} from '../src/lib/lkxox/parse-listing'
import { parseLkxoxProductPage } from '../src/lib/lkxox/parse-product'

assert.equal(parseLkxoxProductIdFromUrl('https://www.lkxox.com/foo-p-17.html'), 17)
assert.equal(lkxoxExternalId(17), 'lkxox-17')
assert.equal(parseLkxoxExternalId('lkxox-17'), 17)
assert.equal(parseLkxoxExternalId('wc-17'), null)
assert.equal(lkxoxPriceToDecimal('$2,490.00 '), 2490)
assert.equal(lkxoxPriceToDecimal('$250.00'), 250)

assert.deepEqual(
  mapLkxoxPrices({ regularText: '$2,690.00 ', saleText: '$250.00' }),
  { purchasePrice: 250, originalPrice: 2690 }
)
assert.deepEqual(
  mapLkxoxPrices({ regularText: '$2,490.00 ', saleText: null }),
  { purchasePrice: 2490, originalPrice: null }
)

assert.equal(
  normalizeLkxoxListUrl('https://www.lkxox.com/products_new.html?disp_order=6'),
  'https://www.lkxox.com/products_new.html?disp_order=6'
)
assert.equal(
  lkxoxListingPageUrl('https://www.lkxox.com/products_new.html?disp_order=6', 2),
  'https://www.lkxox.com/products_new.html?disp_order=6&page=2'
)

const listingHtml = `
<div id="newProductsDefaultListingTopNumber">Displaying <strong>1</strong> to <strong>24</strong> (of <strong>3040</strong> new products)</div>
<div id="newProductsDefault">
  <div class="musheji_bottom">
    <li class="musheji_name"><a href="https://www.lkxox.com/breitling-colt-p-17.html">Breitling Colt</a></li>
  </div>
  <div class="musheji_bottom">
    <li class="musheji_name"><a href="https://www.lkxox.com/rolex-sub-p-2245.html">Rolex Sub</a></li>
  </div>
</div>
`

const summary = parseLkxoxListingSummary(listingHtml)
assert.equal(summary.totalProducts, 3040)
assert.equal(summary.totalPages, 127)

const listItems = parseLkxoxListingPage(
  listingHtml,
  'https://www.lkxox.com/products_new.html?disp_order=6'
)
assert.equal(listItems.length, 2)
assert.equal(listItems[0].externalId, 'lkxox-17')
assert.equal(listItems[1].productId, 2245)

const saleProductHtml = `
<base href="https://www.lkxox.com/"/>
<h1 id="productName">CARTIER TANK SOLO SMALL STEEL LIGHT BROWN STRAP QUARTZ LADIES WATCH W1018255</h1>
<div id="productPrices"><span class="normalprice">$2,690.00 </span>&nbsp;<span class="productSpecialPrice">$250.00</span></div>
<div id="productMainImage">
  <a id="jqzoom" href="images/Cartier/tank.jpg"><img src="images/Cartier/tank.jpg" /></a>
</div>
<div id="productDescription"><table><tbody>
<tr><th> Stock Number: </th><td> Model0441 </td></tr>
<tr><th> Brand: </th><td> Cartier </td></tr>
</tbody></table></div>
`

const saleParsed = parseLkxoxProductPage(
  saleProductHtml,
  'https://www.lkxox.com/cartier-tank-p-99.html'
)
assert.equal(saleParsed.purchasePrice, 250)
assert.equal(saleParsed.originalPrice, 2690)
assert.equal(saleParsed.price, 0)

const productHtml = `
<base href="https://www.lkxox.com/"/>
<h1 id="productName">Breitling Colt Chronograph A73380 Box Papers</h1>
<div id="productPrices"><span class="normalprice">$2,490.00 </span></div>
<div id="productMainImage">
  <a id="jqzoom" href="images/Breitling/ah33gszd.jpg"><img src="images/Breitling/ah33gszd.jpg" /></a>
  <a href="images/Breitling/ah33gszd_8041.jpg"><img src="images/Breitling/ah33gszd_8041.jpg" /></a>
</div>
<div id="productDescription"><table><tbody>
<tr><th> Stock Number: </th><td> 50056 </td></tr>
<tr><th> Brand: </th><td> Breitling </td></tr>
<tr><th> Model Number: </th><td> A73380 </td></tr>
</tbody></table></div>
`

const parsed = parseLkxoxProductPage(
  productHtml,
  'https://www.lkxox.com/breitling-colt-p-17.html'
)
assert.equal(parsed.externalId, 'lkxox-17')
assert.equal(parsed.sku, '50056')
assert.equal(parsed.brandName, 'Breitling')
assert.equal(parsed.price, 0)
assert.equal(parsed.purchasePrice, 2490)
assert.equal(parsed.originalPrice, null)
assert.equal(parsed.imageUrls.length, 2)
assert.ok(parsed.imageUrls[0].includes('ah33gszd.jpg'))
assert.ok(parsed.description.includes('Stock Number: 50056'))

const mapped = mapLkxoxProduct({
  productId: 17,
  externalId: 'lkxox-17',
  name: parsed.name,
  sku: parsed.sku,
  permalink: parsed.permalink,
  description: parsed.description,
  brandName: parsed.brandName,
  regularText: '$2,490.00',
  saleText: null,
  imageUrls: parsed.imageUrls,
})
assert.equal(mapped.price, 0)
assert.equal(mapped.purchasePrice, 2490)
assert.equal(mapped.originalPrice, null)

console.log('All lkxox import tests passed.')
