/**
 * Verifies category id / label resolution (run: npm run test:category-taxonomy)
 */
import assert from 'node:assert/strict'
import type { CategoryPickerOption } from '../src/lib/category-picker'
import {
  categoryIdsFromCompound,
  joinCategoryStorageLabels,
  resolveCategoryOptionFromSegment,
} from '../src/lib/product-taxonomy'

function opt(
  id: string,
  name: string,
  parent: string | null,
  isSubcategory: boolean
): CategoryPickerOption {
  const listLabel = parent ? `${parent} › ${name}` : name
  return {
    id,
    name,
    label: isSubcategory ? `↳ ${listLabel}` : name,
    listLabel,
    depth: isSubcategory ? 1 : 0,
    parent_id: parent ? `${parent}-id` : null,
    parent_name: parent,
    isSubcategory,
  }
}

const options: CategoryPickerOption[] = [
  opt('shoes-top', 'SHOES', null, false),
  opt('soccer-id', 'SOCCER', null, false),
  opt('kids-id', 'KIDS', null, false),
  opt('soccer-shoes', 'SHOES', 'SOCCER', true),
  opt('kids-shoes', 'SHOES', 'KIDS', true),
  opt('kids-shoes-name', 'KIDS SHOES', null, false),
]

assert.equal(resolveCategoryOptionFromSegment('SHOES', options)?.id, 'shoes-top')
assert.equal(resolveCategoryOptionFromSegment('SOCCER › SHOES', options)?.id, 'soccer-shoes')
assert.equal(resolveCategoryOptionFromSegment('KIDS › SHOES', options)?.id, 'kids-shoes')

assert.deepEqual(categoryIdsFromCompound('KIDS › SHOES', options), ['kids-shoes'])
assert.deepEqual(categoryIdsFromCompound('SHOES', options, 'soccer-shoes'), ['soccer-shoes'])
assert.deepEqual(categoryIdsFromCompound('SOCCER › SHOES / BAGS', options), ['soccer-shoes'])

assert.equal(
  joinCategoryStorageLabels(new Set(['kids-shoes', 'shoes-top']), options),
  'SHOES / KIDS › SHOES'
)

console.log('category-taxonomy: all assertions passed')
