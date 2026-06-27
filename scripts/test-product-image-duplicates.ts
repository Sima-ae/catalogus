import assert from 'node:assert/strict'
import { findProductImageDuplicateGroups } from '../src/lib/product-image-duplicates'
import {
  buildProductDisplayGallery,
  cleanProductGalleryUrls,
  dedupeProductImageUrls,
  isBrokenStoredProductImageUrl,
  normalizeProductImageListForStorage,
  normalizeStoredProductImages,
  resolveProductDisplayImages,
  storageProductImageUrl,
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

function testNumericIdAndSizedFolderDedupe() {
  const urls = [
    'https://photo.yupoo.com/jmshop88/41776158.jpg',
    'https://photo.yupoo.com/jmshop88/41776158/small.jpg',
    'https://photo.yupoo.com/jmshop88/41776158/medium.jpg',
    'https://photo.yupoo.com/jmshop88/41776158/large.jpg',
    'https://photo.yupoo.com/jmshop88/99999999/small.jpg',
    'https://photo.yupoo.com/jmshop88/99999999/large.jpg',
  ]
  const deduped = cleanProductGalleryUrls(urls)
  assert.equal(deduped.length, 2)
  assert.equal(
    deduped[0],
    'https://photo.yupoo.com/jmshop88/41776158/large.jpg'
  )
  assert.equal(
    deduped[1],
    'https://photo.yupoo.com/jmshop88/99999999/large.jpg'
  )
}

function testYupooPhotoFolderHashVariants() {
  const urls = [
    'https://photo.yupoo.com/paypalshop/476d627c/large.jpg',
    'https://photo.yupoo.com/paypalshop/476d627c/f6febdc5.jpg',
    'https://photo.yupoo.com/paypalshop/476d627c/big.jpg',
    'https://photo.yupoo.com/paypalshop/c3d59454/big.jpg',
    'https://photo.yupoo.com/paypalshop/c3d59454/5e7f85c3.jpg',
    'https://photo.yupoo.com/paypalshop/c3d59454/large.jpg',
    'https://photo.yupoo.com/paypalshop/d303a9cb/big.jpg',
    'https://photo.yupoo.com/paypalshop/d303a9cb/ca143314.jpg',
    'https://photo.yupoo.com/paypalshop/d303a9cb/large.jpg',
  ]
  const deduped = cleanProductGalleryUrls(urls)
  assert.equal(deduped.length, 3)
  assert.equal(deduped[0], 'https://photo.yupoo.com/paypalshop/476d627c/large.jpg')
  assert.equal(deduped[1], 'https://photo.yupoo.com/paypalshop/c3d59454/large.jpg')
  assert.equal(deduped[2], 'https://photo.yupoo.com/paypalshop/d303a9cb/large.jpg')

  const stored = normalizeStoredProductImages(urls[0], urls.slice(1))
  assert.equal(stored.image_url, deduped[0])
  assert.deepEqual(stored.gallery_images, deduped.slice(1))
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
  assert.equal(deduped[0], upgradeYupooImageUrl('https://photo.yupoo.com/a/medium.jpg'))
  assert.equal(deduped[1], upgradeYupooImageUrl('https://photo.yupoo.com/b/small.jpg'))
}

function testStorageRoundTrip() {
  const proxy =
    '/api/yupoo-image?url=' +
    encodeURIComponent('https://photo.yupoo.com/shop/album/a/medium.jpg')
  assert.equal(
    storageProductImageUrl(proxy),
    upgradeYupooImageUrl('https://photo.yupoo.com/shop/album/a/medium.jpg')
  )

  const stored = normalizeProductImageListForStorage([
    proxy,
    'https://photo.yupoo.com/shop/album/b/small.jpg',
    'https://photo.yupoo.com/shop/album/b/original.jpg',
  ])
  assert.equal(stored?.length, 2)
}

function testStoredCleanupPreservesDisplayGallery() {
  const sourceUrl = 'https://example.x.yupoo.com/albums/123'
  const messyMain = 'https://photo.yupoo.com/jmshop88/41776158/small.jpg'
  const messyGallery = [
    'https://photo.yupoo.com/jmshop88/41776158/medium.jpg',
    'https://photo.yupoo.com/jmshop88/41776158/large.jpg',
    'https://photo.yupoo.com/jmshop88/99999999/small.jpg',
    'https://photo.yupoo.com/jmshop88/99999999/large.jpg',
  ]

  const stored = normalizeStoredProductImages(messyMain, messyGallery)
  assert.equal(stored.image_url, 'https://photo.yupoo.com/jmshop88/41776158/large.jpg')
  assert.deepEqual(stored.gallery_images, [
    'https://photo.yupoo.com/jmshop88/99999999/large.jpg',
  ])

  const { main, gallery } = resolveProductDisplayImages(
    stored.image_url,
    stored.gallery_images,
    sourceUrl
  )
  assert.ok(main.includes('/api/yupoo-image'))
  assert.equal(gallery?.length, 1)
  assert.ok(gallery![0]!.includes('/api/yupoo-image'))

  const displayGallery = buildProductDisplayGallery(
    stored.image_url,
    stored.gallery_images,
    sourceUrl
  )
  assert.equal(displayGallery.length, 2)
  assert.equal(displayGallery[0], main)
  assert.equal(displayGallery[1], gallery![0])
}

function testCatalogMainFallsBackToGallery() {
  const sourceUrl = 'https://example.x.yupoo.com/albums/456'
  const stored = normalizeStoredProductImages('', [
    'https://photo.yupoo.com/shop/a/small.jpg',
    'https://photo.yupoo.com/shop/b/medium.jpg',
  ])
  assert.equal(
    stored.image_url,
    upgradeYupooImageUrl('https://photo.yupoo.com/shop/a/small.jpg')
  )
  assert.equal(stored.gallery_images?.length, 1)

  const { main } = resolveProductDisplayImages(
    stored.image_url,
    stored.gallery_images,
    sourceUrl
  )
  assert.ok(main.includes('/api/yupoo-image'))
  assert.ok(main.includes(encodeURIComponent('large')))
}

testDuplicateGroups()
testGalleryMatch()
testKeepsLargestYupooVariant()
testNumericIdAndSizedFolderDedupe()
testYupooPhotoFolderHashVariants()
testBrokenStoredUrls()
testStorageRoundTrip()
testStoredCleanupPreservesDisplayGallery()
testCatalogMainFallsBackToGallery()
console.log('product-image-duplicates tests passed')
