/**
 *   npx tsx scripts/test-yupoo-unavailable.ts
 */
import assert from 'assert'
import { readFileSync } from 'fs'
import {
  classifySourcePageAvailability,
  isYupooUnavailableAlbumHtml,
  isYupooUnavailableImagePayload,
  isYupooUnavailablePlaceholderImage,
  sha256Hex,
  YUPOO_UNAVAILABLE_IMAGE_SHA256,
} from '@/lib/yupoo/unavailable'

const albumGone = `
<html><head><title>页面未找到</title></head>
<main class="notfound__main">
  <img src="https://s.yupoo.com/website/4.31.41/imgs/notaccess/im_404.png">
  <h1 class="notfound__title">该相册已不存在</h1>
</main></html>
`
assert.equal(isYupooUnavailableAlbumHtml(albumGone), true)
assert.equal(
  classifySourcePageAvailability({ status: 404, html: '', hostHint: 'https://x.yupoo.com/albums/1' })
    .ok,
  false
)
assert.equal(
  classifySourcePageAvailability({
    status: 200,
    html: albumGone,
    imageCount: 0,
    hostHint: 'https://x.yupoo.com/albums/1',
  }).ok,
  false
)
assert.equal(
  classifySourcePageAvailability({
    status: 200,
    html: '<html><body>ok album</body></html>',
    imageCount: 3,
    hostHint: 'https://x.yupoo.com/albums/1',
  }).ok,
  true
)

const xml = Buffer.from(
  `<?xml version='1.0'?><Error><Code>NoSuchKey</Code><Message>gone</Message></Error>`
)
assert.equal(isYupooUnavailableImagePayload(xml, 'application/xml'), true)

const known = Array.from(YUPOO_UNAVAILABLE_IMAGE_SHA256)[0]
assert.ok(known)

// Optional: verify against a downloaded sample if present
try {
  const sample = readFileSync('/tmp/yupoo-check/placeholder.png')
  assert.equal(sha256Hex(sample), known)
  assert.equal(isYupooUnavailablePlaceholderImage(sample), true)
  assert.equal(isYupooUnavailableImagePayload(sample, 'image/png'), true)
} catch {
  // sample may be absent in CI
}

console.log('yupoo-unavailable ok')
