import { randomUUID } from 'crypto'
import path from 'path'
import { shouldWriteCatalogImagesViaSsh } from '@/lib/catalog-images-root'
import { writeCatalogImageFile } from '@/lib/catalog-image-storage'
import {
  type CatalogUploadAuthHeaders,
  catalogImageUploadProxyOrigin,
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

function hasUploadAuth(auth?: CatalogUploadAuthHeaders): boolean {
  return Boolean(String(auth?.userId ?? '').trim() && String(auth?.userEmail ?? '').trim())
}

function preferSshUpload(): boolean {
  return process.env.CATALOG_IMAGE_UPLOAD_VIA_SSH === 'true'
}

async function saveViaProductionProxy(
  file: File,
  buf: Buffer,
  auth: CatalogUploadAuthHeaders
): Promise<{ url: string }> {
  return uploadCatalogImageViaProductionProxy(file, buf, auth)
}

async function saveViaSsh(relativeFile: string, buf: Buffer): Promise<{ url: string }> {
  await writeCatalogImageViaSsh(relativeFile, buf)
  return { url: normalizeProductImageUrl(`/images/${relativeFile}`) }
}

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
    const canProxy = hasUploadAuth(auth) && Boolean(catalogImageUploadProxyOrigin())
    const trySshFirst = preferSshUpload() && process.env.VPS_SSH_KEY?.trim()

    if (canProxy && !trySshFirst) {
      try {
        return await saveViaProductionProxy(file, buf, auth!)
      } catch (proxyErr) {
        console.warn('Production upload proxy failed, trying SSH:', proxyErr)
        if (process.env.VPS_SSH_KEY?.trim()) {
          try {
            return await saveViaSsh(relativeFile, buf)
          } catch {
            /* fall through */
          }
        }
        throw proxyErr
      }
    }

    try {
      return await saveViaSsh(relativeFile, buf)
    } catch (sshErr) {
      console.warn('SSH catalog upload failed:', sshErr)
      if (canProxy) {
        return await saveViaProductionProxy(file, buf, auth!)
      }
      throw new Error(
        'Could not save image to VPS. Set NEXT_PUBLIC_APP_URL and log in as admin, or configure VPS_SSH_KEY.'
      )
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
