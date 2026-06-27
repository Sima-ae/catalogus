import assert from 'node:assert/strict'
import {
  cleanImportDescription,
  containsYupooPlatformText,
  sanitizeProductName,
  stripYupooPlatformText,
} from '../src/lib/yupoo/import-text'

function testTitleStrip() {
  assert.equal(sanitizeProductName('Nike Dunk Low Yupoo'), 'Nike Dunk Low')
  assert.equal(sanitizeProductName('YUPOO Nike Air Max'), 'Nike Air Max')
  assert.equal(sanitizeProductName('Jordan 1 — yupoo album'), 'Jordan 1 — album')
  assert.equal(sanitizeProductName('又拍 Cloud Bag'), 'Cloud Bag')
}

function testDescriptionStrip() {
  const raw =
    'Premium leather bag. See on yupoo.com/albums/123. 又拍 link included.'
  const cleaned = cleanImportDescription(raw, 'Leather Bag', 'LOUIS VUITTON')
  assert.equal(containsYupooPlatformText(cleaned), false)
  assert.match(cleaned, /Premium leather bag/)
}

function testUrlStrip() {
  const raw = 'Photo: https://photo.yupoo.com/shop/album.jpg and jmshop88.x.yupoo.com'
  const cleaned = stripYupooPlatformText(raw)
  assert.equal(containsYupooPlatformText(cleaned), false)
}

testTitleStrip()
testDescriptionStrip()
testUrlStrip()
console.log('yupoo-text-strip tests passed')
