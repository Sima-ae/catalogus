#!/usr/bin/env npx tsx
import assert from 'assert'
import {
  buildPricelistListSql,
  buildPricelistSummarySql,
} from '@/lib/pricelist-list-query'
import { PLATFORM_PRICELIST_OWNER_ID } from '@/lib/pricelist-constants'

const admin = { userId: 'admin-1', role: 'admin' as const, isSuperAdmin: true }
const seller = { userId: 'seller-1', role: 'seller' as const }

const summary = buildPricelistSummarySql(PLATFORM_PRICELIST_OWNER_ID, admin, {})
assert.ok(
  summary.joins.includes('ROW_NUMBER()'),
  'curated summary uses one latest-price window'
)
assert.equal((summary.joins.match(/ROW_NUMBER\(\)/g) || []).length, 1)
assert.ok(summary.missingSql, 'admin curated missing predicate')
assert.ok(summary.filledSql, 'admin curated filled predicate')
assert.ok(summary.outOfStockSql, 'admin curated oos predicate')
assert.equal(summary.extraParams.length, 0)

const missingList = buildPricelistListSql(PLATFORM_PRICELIST_OWNER_ID, admin, {
  missingPricesOnly: true,
})
assert.ok(missingList.joins.includes('ROW_NUMBER()'))
assert.ok(missingList.whereSql.includes('unit_price'))

const sellerSummary = buildPricelistSummarySql(PLATFORM_PRICELIST_OWNER_ID, seller, {})
assert.equal(sellerSummary.joins.includes('ROW_NUMBER()'), false)
assert.ok(sellerSummary.missingSql?.includes('EXISTS'))
assert.equal(sellerSummary.filledSql, null)
assert.ok(sellerSummary.outOfStockSql?.includes('EXISTS'))
assert.ok(sellerSummary.extraParams.length > 0)

const scoped = buildPricelistSummarySql(PLATFORM_PRICELIST_OWNER_ID, admin, {
  search: 'nike dunk',
})
assert.ok(scoped.whereSql.includes('p.name LIKE ?'))
assert.ok(scoped.params.includes('%nike dunk%'))

console.log('pricelist-list-query ok')
