import assert from 'node:assert/strict'
import {
  cleanImportDescription,
  containsCjkScript,
  sanitizeProductName,
  stripCjkScriptFromProductText,
} from '../src/lib/yupoo/import-text'

function testTitleStrip() {
  assert.equal(sanitizeProductName('Nike Dunk 耐克'), 'Nike Dunk')
  assert.equal(sanitizeProductName('乔丹 Air Jordan 1'), 'Air Jordan 1')
  assert.equal(containsCjkScript(sanitizeProductName('路易威登 Bag')), false)
}

function testDescriptionStrip() {
  const raw = 'Premium bag. 正品保证. Leather finish.'
  const cleaned = cleanImportDescription(raw, 'Bag', 'LOUIS VUITTON')
  assert.equal(containsCjkScript(cleaned), false)
  assert.match(cleaned, /Premium bag/)
}

function testMixedLineStrip() {
  const cleaned = stripCjkScriptFromProductText('Size 42 尺码 optional')
  assert.equal(containsCjkScript(cleaned), false)
  assert.match(cleaned, /Size 42/)
}

testTitleStrip()
testDescriptionStrip()
testMixedLineStrip()
console.log('cjk-text-strip tests passed')
