import { randomUUID } from 'crypto'
import path from 'path'
import { shouldWriteCatalogImagesViaSsh } from '@/lib/catalog-images-root'
import { writeCatalogImageFile } from '@/lib/catalog-image-storage'
import {
  type CatalogUploadAuthHeaders,
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

function preferSshUpload(): boolean {
  return process.env.CATALOG_IMAGE_UPLOAD_VIA_SSH === 'true'
}

export async function saveProductImageUpload(
  file: File,
  _auth?: CatalogUploadAuthHeaders
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
    if (preferSshUpload() && process.env.VPS_SSH_KEY?.trim()) {
      try {
        await writeCatalogImageViaSsh(relativeFile, buf)
        return { url: normalizeProductImageUrl(`/images/${relativeFile}`) }
      } catch (err) {
        console.error('SSH catalog upload failed:', err)
        throw new Error(
          'Could not save image to VPS via SSH. Upload from https://superclones.cloud/admin or unset CATALOG_IMAGE_UPLOAD_VIA_SSH.'
        )
      }
    }
    throw new Error(
      'Local dev cannot write to VPS disk directly. Use localhost admin — uploads go to production automatically.'
    )
  }

  try {
    const url = await writeCatalogImageFile(relativeFile, buf)
    return { url: normalizeProductImageUrl(url) }
  } catch (err) {
    console.error('Product image upload failed:', err)
    throw new Error('Could not save image to disk')
  }
}
