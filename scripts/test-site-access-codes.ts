/**
 * Verifies personal site-access code assignment rules (run: npx tsx scripts/test-site-access-codes.ts)
 */
import assert from 'node:assert/strict'
import {
  isSiteAccessCodeAssigned,
  normalizeSiteAccessCode,
} from '../src/lib/site-access-codes-db'

assert.equal(normalizeSiteAccessCode('5'), '0005')
assert.equal(normalizeSiteAccessCode('  42 '), '0042')
assert.equal(normalizeSiteAccessCode(''), null)
assert.equal(normalizeSiteAccessCode('abc'), null)

assert.equal(isSiteAccessCodeAssigned(null), false)
assert.equal(isSiteAccessCodeAssigned(undefined), false)
assert.equal(isSiteAccessCodeAssigned({ user_id: null }), false)
assert.equal(isSiteAccessCodeAssigned({ user_id: 'buyer-1' }), true)

console.log('test-site-access-codes: ok')
