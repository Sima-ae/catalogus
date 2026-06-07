import { randomUUID } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { getCatalogImagesWriteRoots } from '@/lib/catalog-images-root'
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
  const subdir = path.join(
    'uploads',
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, '0')
  )
  const filename = `${randomUUID()}.${ext}`
  const relativePath = path.posix.join('/images', subdir.replace(/\\/g, '/'), filename)

  const roots = getCatalogImagesWriteRoots()
  let written = false
  let lastError: unknown

  for (const root of roots) {
    try {
      const dir = path.join(root, subdir)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(path.join(dir, filename), buf)
      written = true
      break
    } catch (err) {
      lastError = err
    }
  }

  if (!written) {
    console.error('Product image upload failed:', lastError)
    throw new Error('Could not save image to disk')
  }

  return { url: normalizeProductImageUrl(relativePath) }
}
