/**
 * Verifies shop category parent/subcategory rules (run: npx tsx scripts/test-shop-category-tree.ts)
 */
import assert from 'node:assert/strict'
import type { CategoryTreeRow } from '../src/lib/category-picker'
import { buildShopCategoryMenu } from '../src/lib/shop-category-menu'
import {
  categoryHasChildren,
  findParentCategoryName,
  getDirectChildCategories,
  isQualifiedSiblingCategory,
  isShopTopLevelCategory,
  resolveShopCategoryFilter,
} from '../src/lib/shop-category-tree'

function row(
  id: string,
  name: string,
  parent_id: string | null = null
): CategoryTreeRow {
  return { id, name, parent_id }
}

const tree: CategoryTreeRow[] = [
  row('soccer', 'SOCCER'),
  row('shoes-top', 'SHOES'),
  row('slippers', 'SLIPPERS'),
  row('kids-slippers', 'KIDS SLIPPERS', 'slippers'),
  row('soccer-shirts', 'SHIRTS', 'soccer'),
  row('soccer-shoes', 'SHOES', 'soccer'),
  row('soccer-bags', 'BAGS', 'soccer'),
  row('kids-shoes-top', 'KIDS SHOES', 'shoes-top'),
  row('kids', 'KIDS'),
  row('kids-sandals', 'SANDALS', 'kids'),
  row('kids-shoes', 'SHOES', 'kids'),
]

function ids(result: ReturnType<typeof resolveShopCategoryFilter>): string[] {
  return result?.categoryIds ?? []
}

// Qualified sibling detection
assert.equal(isQualifiedSiblingCategory('SLIPPERS', 'KIDS SLIPPERS'), true)
assert.equal(isQualifiedSiblingCategory('SHOES', 'KIDS SHOES'), true)
assert.equal(isQualifiedSiblingCategory('SOCCER', 'SHOES'), false)
assert.equal(isQualifiedSiblingCategory('KIDS', 'SANDALS'), false)
assert.equal(isQualifiedSiblingCategory('SHOES', 'SHOES'), false)

// SLIPPERS must not include KIDS SLIPPERS
const slippersFilter = resolveShopCategoryFilter(tree, { category: 'SLIPPERS' })
assert.deepEqual(ids(slippersFilter), ['slippers'])
assert.equal(slippersFilter?.strictIdOnly, false)

// KIDS SLIPPERS filters only itself (even when wrongly nested)
const kidsSlippersFilter = resolveShopCategoryFilter(tree, {
  category: 'KIDS SLIPPERS',
})
assert.deepEqual(ids(kidsSlippersFilter), ['kids-slippers'])

// Subcategory URL must not treat KIDS SLIPPERS as subcategory of SLIPPERS
const badSub = resolveShopCategoryFilter(tree, {
  category: 'SLIPPERS',
  subcategory: 'KIDS SLIPPERS',
})
assert.deepEqual(ids(badSub), [])

// Real subcategories roll up and filter narrowly
const soccerFilter = resolveShopCategoryFilter(tree, { category: 'SOCCER' })
assert.deepEqual(ids(soccerFilter).sort(), ['soccer', 'soccer-shirts', 'soccer-shoes', 'soccer-bags'].sort())

const soccerShirts = resolveShopCategoryFilter(tree, {
  category: 'SOCCER',
  subcategory: 'SHIRTS',
})
assert.deepEqual(ids(soccerShirts), ['soccer-shirts'])
assert.equal(soccerShirts?.strictIdOnly, true)
assert.deepEqual(soccerShirts?.legacyNames, ['SOCCER › SHIRTS'])
assert.equal(soccerShirts?.categoryStorageLabel, 'SOCCER › SHIRTS')

// SHOES must not include KIDS SHOES or SOCCER › SHOES
const topShoes = resolveShopCategoryFilter(tree, { category: 'SHOES' })
assert.deepEqual(ids(topShoes), ['shoes-top'])

const kidsShoesFilter = resolveShopCategoryFilter(tree, { category: 'KIDS SHOES' })
assert.deepEqual(ids(kidsShoesFilter), ['kids-shoes-top'])

const kidsShoesSub = resolveShopCategoryFilter(tree, {
  category: 'KIDS',
  subcategory: 'SHOES',
})
assert.deepEqual(ids(kidsShoesSub), ['kids-shoes'])
assert.equal(kidsShoesSub?.categoryStorageLabel, 'KIDS › SHOES')

const soccerShoesSub = resolveShopCategoryFilter(tree, {
  category: 'SOCCER',
  subcategory: 'SHOES',
})
assert.deepEqual(ids(soccerShoesSub), ['soccer-shoes'])

// Direct children / subcategory pills
assert.deepEqual(
  getDirectChildCategories(tree, 'SLIPPERS').map((c) => c.name),
  []
)
assert.deepEqual(
  getDirectChildCategories(tree, 'KIDS').map((c) => c.name).sort(),
  ['SANDALS', 'SHOES'].sort()
)
assert.deepEqual(
  getDirectChildCategories(tree, 'SOCCER').map((c) => c.name).sort(),
  ['BAGS', 'SHIRTS', 'SHOES'].sort()
)
assert.equal(categoryHasChildren(tree, 'SLIPPERS'), false)
assert.equal(categoryHasChildren(tree, 'SOCCER'), true)

// Navigation parent resolution
assert.equal(findParentCategoryName(tree, 'SHIRTS'), 'SOCCER')
assert.equal(findParentCategoryName(tree, 'KIDS SLIPPERS'), null)
assert.equal(findParentCategoryName(tree, 'SANDALS'), 'KIDS')

// Shop menu includes detached qualified siblings
const menu = buildShopCategoryMenu(
  tree.map((r) => ({ ...r, active: 1 }))
)
assert.ok(menu.includes('SLIPPERS'))
assert.ok(menu.includes('KIDS SLIPPERS'))
assert.ok(menu.includes('SOCCER'))
assert.ok(!menu.includes('SHIRTS'))
assert.ok(!menu.includes('SANDALS'))

assert.equal(isShopTopLevelCategory(tree, 'KIDS SLIPPERS'), true)
assert.equal(isShopTopLevelCategory(tree, 'SHIRTS'), false)

console.log('shop-category-tree: all assertions passed')
