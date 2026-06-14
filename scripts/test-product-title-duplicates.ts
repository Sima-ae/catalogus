import assert from 'node:assert/strict'
import {
  findProductTitleDuplicateGroups,
  titleDuplicateGroupKey,
} from '../src/lib/product-title-duplicates'

function testHulkGrouping() {
  const result = findProductTitleDuplicateGroups([
    {
      id: '1',
      name: 'Rolex Submariner Hulk Green Dial Steel Mens Watch',
      sku: 'a',
      status: 'active',
      brand: 'ROLEX',
      image_url: '/images/a.jpg',
    },
    {
      id: '2',
      name: 'Rolex Submariner 116610LV Hulk Green 116610LV',
      sku: 'b',
      status: 'active',
      brand: 'ROLEX',
      image_url: '/images/b.jpg',
    },
    {
      id: '3',
      name: 'Rolex Submariner Kermit Green Bezel',
      sku: 'c',
      status: 'active',
      brand: 'ROLEX',
      image_url: '/images/c.jpg',
    },
  ])

  assert.equal(result.groups.length, 1)
  const hulkGroup = result.groups[0]
  assert.ok(hulkGroup.matchLabel.toLowerCase().includes('hulk'))
  assert.equal(hulkGroup.products.length, 2)
}

function testReferenceGrouping() {
  const key = titleDuplicateGroupKey('Omega 226580 Blue Dial Professional', 'OMEGA')
  assert.ok(key)
  assert.match(key!.key, /^ref:omega:226580$/)
}

testHulkGrouping()
testReferenceGrouping()
console.log('product-title-duplicates tests passed')
