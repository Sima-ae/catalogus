import { randomUUID } from 'crypto'
import path from 'path'
import { writeCatalogImageFile } from '@/lib/catalog-image-storage'
import { normalizeProductImageUrl } from '@/lib/product-image-url'

const ALLOWED_TYPES = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
])

const MAX_BYTES = 4 * 1024 * 1024

export type FeaturedLogoVariant = 'default' | 'white'

/** Save a 1-1.club brand logo under the shared catalog images root. */
export async function saveFeaturedBrandLogoUpload(
  file: File,
  variant: FeaturedLogoVariant = 'default'
): Promise<{ url: string }> {
  const ext = ALLOWED_TYPES.get(file.type)
  if (!ext) {
    throw new Error('Only JPEG, PNG, WebP, and GIF images are allowed')
  }

  const buf = Buffer.from(await file.arrayBuffer())
  if (buf.length > MAX_BYTES) {
    throw new Error('Logo must be 4 MB or smaller')
  }

  const filename = `${variant}-${randomUUID()}.${ext}`
  const relativeFromImagesRoot = path.posix.join('brand', 'featured', filename)
  const publicUrl = await writeCatalogImageFile(relativeFromImagesRoot, buf)
  return { url: normalizeProductImageUrl(publicUrl) }
}
