import {
  canonicalProductImageKey,
  isBrandingGalleryImageUrl,
  isPlaceholderImageUrl,
} from '@/lib/product-image-url'

export type ProductImageDuplicateInput = {
  id: string
  name: string
  sku: string | null
  status: string
  image_url: string
  gallery_images?: string[] | null
}

export type ImageDuplicateProduct = {
  id: string
  name: string
  sku: string | null
  status: string
  image_url: string
}

export type ImageDuplicateGroup = {
  imageKey: string
  sampleImageUrl: string
  products: ImageDuplicateProduct[]
}

export type ImageDuplicateScanResult = {
  groups: ImageDuplicateGroup[]
  scannedProducts: number
  duplicateProductIds: string[]
}

function toDuplicateProduct(row: ProductImageDuplicateInput): ImageDuplicateProduct {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    status: row.status,
    image_url: row.image_url,
  }
}

function imageKeysForProduct(row: ProductImageDuplicateInput): { key: string; url: string }[] {
  const urls: string[] = []
  const main = String(row.image_url ?? '').trim()
  if (main && !isPlaceholderImageUrl(main) && !isBrandingGalleryImageUrl(main)) {
    urls.push(main)
  }
  for (const raw of row.gallery_images ?? []) {
    const url = String(raw ?? '').trim()
    if (!url || isPlaceholderImageUrl(url) || isBrandingGalleryImageUrl(url)) continue
    urls.push(url)
  }

  const seen = new Set<string>()
  const out: { key: string; url: string }[] = []
  for (const url of urls) {
    const key = canonicalProductImageKey(url)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push({ key, url })
  }
  return out
}

/** Group catalog products that share the same canonical image (main or gallery). */
export function findProductImageDuplicateGroups(
  products: ProductImageDuplicateInput[]
): ImageDuplicateScanResult {
  const byKey = new Map<string, { sampleImageUrl: string; productIds: Set<string> }>()
  const productById = new Map<string, ProductImageDuplicateInput>()

  for (const product of products) {
    productById.set(product.id, product)
    for (const { key, url } of imageKeysForProduct(product)) {
      let bucket = byKey.get(key)
      if (!bucket) {
        bucket = { sampleImageUrl: url, productIds: new Set() }
        byKey.set(key, bucket)
      }
      bucket.productIds.add(product.id)
    }
  }

  const groups: ImageDuplicateGroup[] = []
  const duplicateProductIds = new Set<string>()

  for (const [imageKey, bucket] of Array.from(byKey.entries())) {
    if (bucket.productIds.size < 2) continue
    const groupProducts = Array.from(bucket.productIds)
      .map((id) => productById.get(id))
      .filter((p): p is ProductImageDuplicateInput => Boolean(p))
      .map(toDuplicateProduct)
      .sort((a, b) => a.name.localeCompare(b.name))

    for (const p of groupProducts) duplicateProductIds.add(p.id)

    groups.push({
      imageKey,
      sampleImageUrl: bucket.sampleImageUrl,
      products: groupProducts,
    })
  }

  groups.sort((a, b) => {
    const countDiff = b.products.length - a.products.length
    if (countDiff !== 0) return countDiff
    return a.imageKey.localeCompare(b.imageKey)
  })

  return {
    groups,
    scannedProducts: products.length,
    duplicateProductIds: Array.from(duplicateProductIds),
  }
}
