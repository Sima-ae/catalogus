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
  assert.equal(sanitizeProductName('Yupoo'), '')
  assert.equal(sanitizeProductName('yupoo'), '')
  assert.equal(sanitizeProductName('yupoo123'), '')
  assert.equal(sanitizeProductName('myupoo'), '')
  assert.equal(sanitizeProductName('查看yupoo相册'), '')
  assert.equal(
    containsYupooPlatformText(sanitizeProductName('https://photo.yupoo.com/shop/123')),
    false
  )
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

function testEmbeddedYupooSubstring() {
  const cases: Array<{ raw: string; expect: RegExp | string; mustNotMatch?: RegExp }> = [
    { raw: 'yupoo123 best quality', expect: '' },
    { raw: 'myupoo link here', expect: '' },
    { raw: 'see yupooalbum for pics', expect: '' },
    { raw: 'yupoo123 best quality see yupooalbum', expect: '' },
    {
      raw: 'Premium leather bag. yupoo123 and myupoo links.',
      expect: /Premium leather bag/,
      mustNotMatch: /\b123\b|\bm\b|yupoo/i,
    },
    {
      raw: 'Air Jordan 1 yupoo quality replica',
      expect: /Air Jordan 1 quality replica/,
    },
  ]

  for (const { raw, expect, mustNotMatch } of cases) {
    const cleaned = cleanImportDescription(raw, 'Nike Shoe', null)
    assert.equal(containsYupooPlatformText(cleaned), false, `yupoo left in: ${raw}`)
    if (typeof expect === 'string') {
      assert.equal(cleaned, expect, `unexpected clean for: ${raw}`)
    } else {
      assert.match(cleaned, expect, `unexpected clean for: ${raw} -> ${cleaned}`)
    }
    if (mustNotMatch) {
      assert.doesNotMatch(cleaned, mustNotMatch, `artifact left in: ${raw} -> ${cleaned}`)
    }
  }
}

testTitleStrip()
testDescriptionStrip()
testUrlStrip()
testEmbeddedYupooSubstring()
console.log('yupoo-text-strip tests passed')
