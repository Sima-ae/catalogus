/**
 * Verifies qualified category text matching for shop/admin filters.
 * Run: npx tsx scripts/test-category-filter-sql.ts
 */
import assert from 'node:assert/strict'
import { buildQualifiedCategoryTextMatch } from '../src/lib/catalog-products'

const { sql, params } = buildQualifiedCategoryTextMatch(['KIDS › SHOES', 'SOCCER › SHOES'])
assert.ok(params.includes('KIDS › SHOES'))
assert.ok(params.includes('SOCCER › SHOES'))
assert.equal(params.length, 8)
assert.ok(!params.includes('SHOES'))

console.log('category-filter-sql: all assertions passed')
