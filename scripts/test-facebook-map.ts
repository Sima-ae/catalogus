#!/usr/bin/env npx tsx
/**
 * Facebook import mapping tests.
 * Run: npm run test:facebook-map
 */
import assert from 'node:assert/strict'
import { parseEmojiPriceHint } from '../src/lib/facebook/parse-emoji-price'
import {
  dedupeFacebookImageUrls,
  estimateFacebookImagePixels,
  maximizeFacebookImageUrl,
} from '../src/lib/facebook/image-urls'
import {
  canonicalizeFacebookUrl,
  FACEBOOK_EXTERNAL_ID_MAX,
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
assert.ok(externalId.startsWith('fb-pfb-'))
assert.ok(externalId.length <= FACEBOOK_EXTERNAL_ID_MAX)

const photoCarouselUrl =
  'https://www.facebook.com/photo?fbid=122208937622516795&set=pcb.122208938522516795'
assert.equal(facebookExternalIdFromUrl(photoCarouselUrl), 'fb-pcb-122208938522516795')
assert.ok(isFacebookPermalinkMeta(parseFacebookUrlMeta(sampleUrl)))
assert.ok(facebookPermalinkFetchUrls(parseFacebookUrlMeta(sampleUrl)).length >= 2)
assert.ok(externalId.length <= FACEBOOK_EXTERNAL_ID_MAX)

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

const asset = '717317615_122208938648516795_943859546803776397'
const small = `https://scontent.test/v/t39.30808-6/${asset}_n.jpg?stp=cp6_dst-jpg_tt6&cstp=mx600x800&ctp=p600x600`
const large = `https://scontent.test/v/t39.30808-6/${asset}_n.jpg?stp=cp6_dst-jpg_tt6&cstp=mx1536x2048&ctp=p600x600`
assert.ok(
  estimateFacebookImagePixels(maximizeFacebookImageUrl(large)) >
    estimateFacebookImagePixels(maximizeFacebookImageUrl(small))
)
assert.equal(dedupeFacebookImageUrls([small, large]).length, 1)
assert.ok(maximizeFacebookImageUrl(large).includes('cstp=mx1536x2048'))
assert.ok(!maximizeFacebookImageUrl(large).includes('ctp='))

console.log('facebook-map tests passed')
