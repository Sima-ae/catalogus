#!/usr/bin/env npx tsx
/**
 * Facebook import mapping tests.
 * Run: npm run test:facebook-map
 */
import assert from 'node:assert/strict'
import { parseEmojiPriceHint } from '../src/lib/facebook/parse-emoji-price'
import {
  canonicalizeFacebookUrl,
  facebookExternalIdFromUrl,
  facebookPermalinkFetchUrls,
  isFacebookPermalinkMeta,
  normalizeFacebookPostUrl,
  parseFacebookUrlMeta,
} from '../src/lib/facebook/parse-url'
import { mapFacebookPost } from '../src/lib/facebook/map-product'
import { facebookImportMirrorRelativeDir } from '../src/lib/facebook/mirror-images'

assert.equal(parseEmojiPriceHint('Price 4️⃣5️⃣0️⃣ euro'), 450)
assert.equal(parseEmojiPriceHint('Only text'), null)
assert.equal(parseEmojiPriceHint('€ 1200'), 1200)

const sampleUrl =
  'https://www.facebook.com/permalink.php?story_fbid=pfbid0fkLmBCLsoP1XQBCTqbnG2apaWv1YwC7XrmdPKtUa2PiXK7ZpP4Zsa2WUnMSJ2Ygel&id=61565503873297'
assert.ok(normalizeFacebookPostUrl(sampleUrl).includes('facebook.com'))
const externalId = facebookExternalIdFromUrl(sampleUrl)
assert.ok(externalId.startsWith('fb-pfbid'))
assert.ok(isFacebookPermalinkMeta(parseFacebookUrlMeta(sampleUrl)))
assert.ok(facebookPermalinkFetchUrls(parseFacebookUrlMeta(sampleUrl)).length >= 2)

const photoCarouselUrl =
  'https://www.facebook.com/photo?fbid=122208937622516795&set=pcb.122208938522516795'
assert.equal(facebookExternalIdFromUrl(photoCarouselUrl), 'fb-pcb-122208938522516795')
assert.ok(canonicalizeFacebookUrl(photoCarouselUrl).includes('photo.php'))

const mapped = mapFacebookPost({
  postUrl: sampleUrl,
  externalId,
  title: 'Sample sneaker post',
  description: 'Description with 4️⃣5️⃣0️⃣ price',
  imageUrls: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
  detectedPriceHint: 450,
})
assert.equal(mapped.title, 'Sample sneaker post')
assert.equal(mapped.imageUrls.length, 2)

assert.equal(
  facebookImportMirrorRelativeDir(externalId),
  `imports/facebook/${externalId.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`
)

console.log('facebook-map tests passed')
