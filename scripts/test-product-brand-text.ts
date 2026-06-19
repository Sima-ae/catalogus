import assert from 'node:assert/strict'
import { fixBrandNamesInText, lettersOnlyBrandKey, polishProductDisplayText } from '../src/lib/product-brand-text'

const BRANDS = ['VERSACE', 'LOUIS VUITTON', 'GUCCI', 'ROLEX', 'PHILIPP PLEIN']

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

console.log('test-product-brand-text: ok')
