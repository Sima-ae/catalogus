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

const MAX_BYTES = 8 * 1024 * 1024

export async function saveProductImageUpload(file: File): Promise<{ url: string }> {
  const ext = ALLOWED_TYPES.get(file.type)
  if (!ext) {
    throw new Error('Only JPEG, PNG, WebP, and GIF images are allowed')
  }

  const buf = Buffer.from(await file.arrayBuffer())
  if (buf.length > MAX_BYTES) {
    throw new Error('Image must be 8 MB or smaller')
  }

  const now = new Date()
  const subdir = path.posix.join(
    'uploads',
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, '0')
  )
  const filename = `${randomUUID()}.${ext}`
  const relativeFile = path.posix.join(subdir, filename)

  const url = await writeCatalogImageFile(relativeFile, buf)
  return { url: normalizeProductImageUrl(url) }
}
