import assert from 'node:assert/strict'
import {
  detectBrandsFromProductFields,
  detectImportBrandsFromProductFields,
  fixBrandNamesInText,
  isMixedBrandLabel,
  lettersOnlyBrandKey,
  polishProductDisplayText,
  resolveImportBrandFromProductText,
  IMPORT_BRAND_MIXED_FALLBACK,
} from '../src/lib/product-brand-text'
import { joinBrandNames } from '../src/lib/product-taxonomy'

const BRANDS = ['VERSACE', 'LOUIS VUITTON', 'GUCCI', 'ROLEX', 'PHILIPP PLEIN']
const BRANDS_WITH_LUXURY = [...BRANDS, 'FENDI', 'PRADA', 'HERMES']

assert.equal(lettersOnlyBrandKey('VERSAC*E'), 'versace')

assert.equal(
  fixBrandNamesInText('VERSAC E - VE 4387', BRANDS, 'VERSACE'),
  'VERSACE - VE 4387'
)

assert.equal(fixBrandNamesInText('VERSAC*E - VE 4387', BRANDS, 'VERSACE'), 'VERSACE - VE 4387')

assert.equal(
  fixBrandNamesInText('LOUIS VU ITTON belt', BRANDS),
  'LOUIS VUITTON belt'
)

assert.equal(
  polishProductDisplayText({
    name: 'VERSAC E - VE 4387',
    description: 'VERSAC*E sunglasses with VERSAC E case',
    brand: 'VERSACE',
    brandNames: BRANDS,
  }).name,
  'VERSACE - VE 4387'
)

assert.equal(
  polishProductDisplayText({
    name: 'VERSACE - VE 4387',
    description: 'VERSAC E model',
    brand: 'VERSACE',
    brandNames: BRANDS,
  }).description.includes('VERSACE'),
  true
)

assert.equal(
  fixBrandNamesInText('PHILIPP PLIEN - 004M', BRANDS, 'PHILIPP PLEIN'),
  'PHILIPP PLEIN - 004M'
)

assert.equal(
  fixBrandNamesInText('415 L0UIS VUITT0N bag', BRANDS),
  '415 LOUIS VUITTON bag'
)

assert.equal(isMixedBrandLabel('- MIXED -'), true)
assert.equal(isMixedBrandLabel('MIXED'), true)
assert.equal(isMixedBrandLabel('GUCCI'), false)

assert.deepEqual(
  detectBrandsFromProductFields(
    { name: 'FENDI Baguette mini bag', description: 'Leather shoulder bag' },
    BRANDS_WITH_LUXURY
  ),
  ['FENDI']
)

assert.equal(
  joinBrandNames(
    new Set(detectBrandsFromProductFields({ name: 'GUCCI X PRADA tote' }, BRANDS_WITH_LUXURY)),
    BRANDS_WITH_LUXURY
  ),
  'GUCCI X PRADA'
)

assert.deepEqual(
  detectBrandsFromProductFields(
    { name: '89491', description: 'Classic HERMES Kelly style bag' },
    BRANDS_WITH_LUXURY
  ),
  ['HERMES']
)

assert.equal(
  resolveImportBrandFromProductText({ name: 'FENDI Baguette mini bag' }, null, BRANDS_WITH_LUXURY),
  'FENDI'
)

assert.equal(
  resolveImportBrandFromProductText({ name: 'LV 2026 sweatpants' }, null, [
    ...BRANDS_WITH_LUXURY,
    'LOUIS VUITTON',
    'DOLCE & GABBANA',
    'CHROME HEARTS',
    'THOM BROWNE',
    'MIU MIU',
    'LORO PIANA',
    'LOEWE',
    'DIOR',
    'MONCLER',
  ]),
  'LOUIS VUITTON'
)

assert.equal(
  resolveImportBrandFromProductText({ name: 'Generic unbranded item 2026' }, null, BRANDS_WITH_LUXURY),
  IMPORT_BRAND_MIXED_FALLBACK
)

assert.equal(
  resolveImportBrandFromProductText({ name: 'FENDI bag' }, 'GUCCI', BRANDS_WITH_LUXURY),
  'GUCCI'
)

console.log('test-product-brand-text: ok')
