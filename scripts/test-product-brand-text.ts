import assert from 'node:assert/strict'
import { fixBrandNamesInText, lettersOnlyBrandKey, polishProductDisplayText } from '../src/lib/product-brand-text'

const BRANDS = ['VERSACE', 'LOUIS VUITTON', 'GUCCI', 'ROLEX']

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

console.log('test-product-brand-text: ok')
