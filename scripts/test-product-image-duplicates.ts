import assert from 'node:assert/strict'
import { findProductImageDuplicateGroups } from '../src/lib/product-image-duplicates'
import {
  cleanProductGalleryUrls,
  dedupeProductImageUrls,
  isBrokenStoredProductImageUrl,
  upgradeYupooImageUrl,
} from '../src/lib/product-image-url'

function testDuplicateGroups() {
  const result = findProductImageDuplicateGroups([
    {
      id: 'a',
      name: 'Alpha',
      sku: '111',
      status: 'active',
      image_url: 'https://photo.yupoo.com/shop/small.jpg',
      gallery_images: null,
    },
    {
      id: 'b',
      name: 'Beta',
      sku: '222',
      status: 'draft',
      image_url: 'https://photo.yupoo.com/shop/medium.jpg',
      gallery_images: null,
    },
    {
      id: 'c',
      name: 'Gamma',
      sku: '333',
      status: 'active',
      image_url: '/images/other-watch.jpg',
      gallery_images: null,
    },
  ])

  assert.equal(result.groups.length, 1)
  assert.equal(result.groups[0]?.products.length, 2)
  assert.deepEqual(
    result.groups[0]?.products.map((p) => p.id).sort(),
    ['a', 'b']
  )
  assert.deepEqual(result.duplicateProductIds.sort(), ['a', 'b'])
  assert.equal(result.scannedProducts, 3)
}

function testGalleryMatch() {
  const result = findProductImageDuplicateGroups([
    {
      id: 'a',
      name: 'Alpha',
      sku: null,
      status: 'active',
      image_url: '/images/a-main.jpg',
      gallery_images: ['https://photo.yupoo.com/shop/medium.jpg'],
    },
    {
      id: 'b',
      name: 'Beta',
      sku: null,
      status: 'active',
      image_url: 'https://photo.yupoo.com/shop/small.jpg',
      gallery_images: null,
    },
  ])

  assert.equal(result.groups.length, 1)
  assert.equal(result.groups[0]?.products.length, 2)
}

function testKeepsLargestYupooVariant() {
  const urls = [
    'https://photo.yupoo.com/shop/album/photo123/small.jpg',
    'https://photo.yupoo.com/shop/album/photo123/medium.jpg',
    'https://photo.yupoo.com/shop/album/photo123/original.jpg',
  ]
  const deduped = dedupeProductImageUrls(urls)
  assert.equal(deduped.length, 1)
  assert.equal(deduped[0], upgradeYupooImageUrl(urls[2]!))

  const gallery = cleanProductGalleryUrls([
    'https://photo.yupoo.com/shop/album/a/small.jpg',
    'https://photo.yupoo.com/shop/album/a/original.jpg',
    'https://photo.yupoo.com/shop/album/b/medium.jpg',
  ])
  assert.equal(gallery.length, 2)
  assert.equal(gallery[0], upgradeYupooImageUrl('https://photo.yupoo.com/shop/album/a/original.jpg'))
  assert.equal(gallery[1], upgradeYupooImageUrl('https://photo.yupoo.com/shop/album/b/medium.jpg'))
}

function testBrokenStoredUrls() {
  assert.equal(isBrokenStoredProductImageUrl(''), true)
  assert.equal(isBrokenStoredProductImageUrl('/api/yupoo-image'), true)
  assert.equal(
    isBrokenStoredProductImageUrl(
      '/api/yupoo-image?url=https%3A%2F%2Fphoto.yupoo.com%2Fx%2Flarge.jpg'
    ),
    false
  )
  assert.equal(isBrokenStoredProductImageUrl('https://photo.yupoo.com/x/small.jpg'), false)
  assert.equal(isBrokenStoredProductImageUrl('/images/products/foo.jpg'), false)

  const deduped = dedupeProductImageUrls([
    '/api/yupoo-image?url=https%3A%2F%2Fphoto.yupoo.com%2Fa%2Fmedium.jpg',
    '/api/yupoo-image?url=https%3A%2F%2Fphoto.yupoo.com%2Fb%2Fsmall.jpg',
  ])
  assert.equal(deduped.length, 2)
  assert.ok(deduped[0]!.includes('url='))
}

testDuplicateGroups()
testGalleryMatch()
testKeepsLargestYupooVariant()
testBrokenStoredUrls()
console.log('product-image-duplicates tests passed')
