#!/usr/bin/env npx tsx
import assert from 'assert'
import {
  buildProductSearchFilter,
  fulltextBooleanSearchTerm,
} from '@/lib/product-search-sql'

assert.equal(
  fulltextBooleanSearchTerm('25-26 Marseille away shorts1'),
  '+Marseille* +shorts1*',
  'drops hyphenated shorts + stopword away'
)

assert.equal(fulltextBooleanSearchTerm('the and or'), null, 'all-stopword query → LIKE fallback')

const ft = buildProductSearchFilter('25-26 Marseille away shorts1', { useFulltext: true })
assert.ok(ft.sql.includes('MATCH('))
assert.ok(ft.sql.includes('p.name LIKE ?'))
assert.ok(ft.sql.includes('p.sku LIKE ?'))
assert.deepEqual(ft.params[0], '+Marseille* +shorts1*')
assert.equal(ft.params[1], '%25-26 Marseille away shorts1%')

const like = buildProductSearchFilter('203327583', { useFulltext: false })
assert.ok(like.sql.includes('p.sku LIKE ?'))

console.log('product-search-sql ok')
