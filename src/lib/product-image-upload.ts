import { randomUUID } from 'crypto'
import path from 'path'
import { shouldWriteCatalogImagesViaSsh } from '@/lib/catalog-images-root'
import { writeCatalogImageFile } from '@/lib/catalog-image-storage'
import {
  type CatalogUploadAuthHeaders,
  uploadCatalogImageViaProductionProxy,
  writeCatalogImageViaSsh,
} from '@/lib/catalog-image-vps-write'
import { normalizeProductImageUrl } from '@/lib/product-image-url'

const ALLOWED_TYPES = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
])

const MAX_BYTES = 8 * 1024 * 1024

export async function saveProductImageUpload(
  file: File,
  auth?: CatalogUploadAuthHeaders
): Promise<{ url: string }> {
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

  if (shouldWriteCatalogImagesViaSsh()) {
    try {
      await writeCatalogImageViaSsh(relativeFile, buf)
      return { url: normalizeProductImageUrl(`/images/${relativeFile}`) }
    } catch (sshErr) {
      console.warn('SSH catalog upload failed, trying production proxy:', sshErr)
      try {
        return await uploadCatalogImageViaProductionProxy(file, buf, auth ?? {})
      } catch (proxyErr) {
        console.error('Production upload proxy failed:', proxyErr)
        throw new Error(
          'Could not save image to VPS. Use a deploy SSH key (VPS_SSH_KEY) or ensure https://superclones.cloud is reachable.'
        )
      }
    }
  }

  try {
    const url = await writeCatalogImageFile(relativeFile, buf)
    return { url: normalizeProductImageUrl(url) }
  } catch (err) {
    console.error('Product image upload failed:', err)
    throw new Error('Could not save image to disk')
  }
}
