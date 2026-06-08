/**
 * Run: npx tsx scripts/test-product-category-match.ts
 */
import assert from 'node:assert/strict'
import type { CategoryTreeRow } from '../src/lib/category-picker'
import {
  productCategoryTextMatchesQualifiedLabels,
  productMatchesShopCategoryFilter,
} from '../src/lib/product-category-match'
import { resolveShopCategoryFilter } from '../src/lib/shop-category-tree'

function row(
  id: string,
  name: string,
  parent_id: string | null = null
): CategoryTreeRow {
  return { id, name, parent_id }
}

const tree: CategoryTreeRow[] = [
  row('kids', 'KIDS'),
  row('kids-shoes', 'SHOES', 'kids'),
  row('kids-shirts', 'SHIRTS', 'kids'),
  row('shoes-top', 'SHOES'),
]

const kidsFilter = resolveShopCategoryFilter(tree, { category: 'KIDS' })!
assert.ok(
  productMatchesShopCategoryFilter(
    { category_id: 'kids-shoes', category: 'KIDS › SHOES' },
    kidsFilter
  )
)
assert.ok(
  productMatchesShopCategoryFilter(
    { category_id: null, category: 'KIDS › SHOES' },
    kidsFilter
  )
)
assert.equal(
  productMatchesShopCategoryFilter(
    { category_id: null, category: 'SHOES' },
    kidsFilter
  ),
  false
)

const kidsShoesSub = resolveShopCategoryFilter(tree, {
  category: 'KIDS',
  subcategory: 'SHOES',
})!
assert.ok(
  productMatchesShopCategoryFilter(
    { category_id: 'kids-shoes', category: 'KIDS › SHOES' },
    kidsShoesSub
  )
)
assert.equal(
  productMatchesShopCategoryFilter(
    { category_id: 'kids-shirts', category: 'KIDS › SHIRTS' },
    kidsShoesSub
  ),
  false
)

assert.ok(productCategoryTextMatchesQualifiedLabels('KIDS › SHOES / OTHER', ['KIDS › SHOES']))
assert.ok(productCategoryTextMatchesQualifiedLabels('X / KIDS › SHOES', ['KIDS › SHOES']))

console.log('product-category-match tests passed')
