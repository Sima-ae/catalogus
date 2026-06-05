/**
 * Verifies qualified category text matching for shop/admin filters.
 * Run: npx tsx scripts/test-category-filter-sql.ts
 */
import assert from 'node:assert/strict'
import {
  buildActiveCatalogFilters,
  buildQualifiedCategoryTextMatch,
  combineCategoryIdAndLegacyTextMatch,
  PRODUCT_CATEGORY_ID_UNSET_SQL,
} from '../src/lib/catalog-products'

const { sql, params } = buildQualifiedCategoryTextMatch(['KIDS › SHOES', 'SOCCER › SHOES'])
assert.ok(params.includes('KIDS › SHOES'))
assert.ok(params.includes('SOCCER › SHOES'))
assert.equal(params.length, 8)
assert.ok(!params.includes('SHOES'))

const combined = combineCategoryIdAndLegacyTextMatch(
  'p.category_id IN (?)',
  ['shoes-top'],
  buildQualifiedCategoryTextMatch(['SHOES'])
)
assert.ok(combined.sql.includes(PRODUCT_CATEGORY_ID_UNSET_SQL))
assert.ok(combined.sql.includes('p.category_id IN (?)'))
assert.ok(!combined.sql.includes('OR p.category = ? OR (p.category_id IS NOT NULL'))

const topShoesFilter = buildActiveCatalogFilters({
  page: 1,
  limit: 50,
  categoryIds: ['shoes-top'],
  legacyCategoryNames: ['SHOES'],
  excludeCategoryIds: ['kids-shoes', 'soccer-shoes'],
})
assert.ok(topShoesFilter.whereSql.includes(PRODUCT_CATEGORY_ID_UNSET_SQL))
assert.ok(topShoesFilter.whereSql.includes('NOT IN'))
assert.equal(topShoesFilter.params.filter((p) => p === 'kids-shoes').length, 1)
assert.equal(topShoesFilter.params.filter((p) => p === 'soccer-shoes').length, 1)

const kidsShoesFilter = buildActiveCatalogFilters({
  page: 1,
  limit: 50,
  categoryIds: ['kids-shoes'],
  legacyCategoryNames: ['KIDS › SHOES'],
  strictCategoryIdOnly: true,
  categoryStorageLabel: 'KIDS › SHOES',
})
assert.ok(kidsShoesFilter.params.includes('KIDS › SHOES'))
assert.ok(kidsShoesFilter.whereSql.includes(PRODUCT_CATEGORY_ID_UNSET_SQL))

console.log('category-filter-sql: all assertions passed')
