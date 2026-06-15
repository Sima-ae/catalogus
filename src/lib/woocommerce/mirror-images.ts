import fs from 'fs/promises'
import path from 'path'
import {
  catalogImagePublicPath,
  writeCatalogImageFile,
} from '@/lib/catalog-image-storage'
import { getCatalogImagesWriteRoots } from '@/lib/catalog-images-root'
import {
  cleanProductGalleryUrls,
  isCatalogHostedImage,
  normalizeProductImageUrl,
} from '@/lib/product-image-url'
import { fetchWooRemoteUrl } from '@/lib/woocommerce/client'

const MAX_BYTES = 12 * 1024 * 1024
const MIRROR_SUBDIR = 'imports/woocommerce'

const CONTENT_TYPE_EXT = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/jpg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
])

function sanitizeExternalId(externalId: string): string {
  const safe = String(externalId ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (!safe) throw new Error('WooCommerce external id is required to mirror images')
  return safe
}

export function wooImportMirrorRelativeDir(externalId: string): string {
  return `${MIRROR_SUBDIR}/${sanitizeExternalId(externalId)}`
}

export function isWooImportMirrorPath(url: string | null | undefined): boolean {
  const raw = String(url ?? '').trim()
  if (!raw) return false
  try {
    const pathPart = raw.startsWith('http') ? new URL(raw).pathname : raw
    return pathPart.includes(`/images/${MIRROR_SUBDIR}/`)
  } catch {
    return raw.includes(`/images/${MIRROR_SUBDIR}/`) || raw.includes(`${MIRROR_SUBDIR}/`)
  }
}

export function isRemoteHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim())
}

function extFromContentType(contentType: string | null): string | null {
  if (!contentType) return null
  const base = contentType.split(';')[0].trim().toLowerCase()
  return CONTENT_TYPE_EXT.get(base) ?? null
}

function extFromUrl(url: string): string | null {
  const match = url.split('?')[0].match(/\.(jpe?g|png|webp|gif)$/i)
  if (!match) return null
  const ext = match[1].toLowerCase()
  return ext === 'jpeg' ? 'jpg' : ext
}

function resolveImageExtension(contentType: string | null, url: string): string {
  return extFromContentType(contentType) || extFromUrl(url) || 'jpg'
}

function padIndex(index: number): string {
  return String(index).padStart(3, '0')
}

async function downloadRemoteImage(url: string): Promise<{ buffer: Buffer; contentType: string | null }> {
  const res = await fetchWooRemoteUrl(url, {
    headers: {
      Accept: 'image/*,*/*;q=0.8',
      'User-Agent': 'CatalogusImport/1.0',
    },
    redirect: 'follow',
  })

  if (!res.ok) {
    throw new Error(`Image download failed (${res.status}): ${url}`)
  }

  const contentType = res.headers.get('content-type')
  const buffer = Buffer.from(await res.arrayBuffer())
  if (!buffer.length) {
    throw new Error(`Empty image response: ${url}`)
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error(`Image exceeds ${MAX_BYTES} bytes: ${url}`)
  }

  const typeBase = contentType?.split(';')[0].trim().toLowerCase() ?? ''
  if (typeBase && !typeBase.startsWith('image/') && buffer.subarray(0, 256).includes('<html')) {
    throw new Error(`Expected image, got ${typeBase}: ${url}`)
  }

  return { buffer, contentType: typeBase || null }
}

async function pruneExtraMirrorFiles(productDir: string, keepCount: number): Promise<void> {
  if (keepCount < 0) return
  for (const root of getCatalogImagesWriteRoots()) {
    const dirPath = path.join(root, productDir)
    let entries: string[]
    try {
      entries = await fs.readdir(dirPath)
    } catch {
      continue
    }
    for (const name of entries) {
      const match = /^(\d{3})\.(jpe?g|png|webp|gif)$/i.exec(name)
      if (!match) continue
      if (Number(match[1]) > keepCount) {
        try {
          await fs.unlink(path.join(dirPath, name))
        } catch {
          /* ignore */
        }
      }
    }
  }
}

/**
 * Download WooCommerce product images to /images/imports/woocommerce/{externalId}/.
 * Returns local catalog URLs in the same order (deduped, branding stripped).
 */
export async function mirrorWooCommerceProductImages(
  externalId: string,
  imageUrls: string[]
): Promise<string[]> {
  const cleaned = cleanProductGalleryUrls(imageUrls)
  if (!cleaned.length) return []

  const productDir = wooImportMirrorRelativeDir(externalId)
  const mirrored: string[] = []
  let downloadIndex = 0
  let downloadFailures = 0

  for (const url of cleaned) {
    if (isWooImportMirrorPath(url)) {
      mirrored.push(normalizeProductImageUrl(url))
      continue
    }

    if (isCatalogHostedImage(url) && !isRemoteHttpUrl(url)) {
      mirrored.push(normalizeProductImageUrl(url))
      continue
    }

    if (!isRemoteHttpUrl(url)) {
      continue
    }

    try {
      downloadIndex++
      const { buffer, contentType } = await downloadRemoteImage(url)
      const ext = resolveImageExtension(contentType, url)
      const relativeFile = `${productDir}/${padIndex(downloadIndex)}.${ext}`
      const localUrl = await writeCatalogImageFile(relativeFile, buffer)
      mirrored.push(localUrl)
    } catch (err) {
      downloadFailures++
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`[woo-mirror] skip image for ${externalId}: ${message}`)
    }
  }

  if (downloadIndex > 0) {
    await pruneExtraMirrorFiles(productDir, downloadIndex)
  }

  if (!mirrored.length && downloadFailures > 0) {
    throw new Error(
      `Could not mirror any images for ${externalId} (${downloadFailures} failed)`
    )
  }

  return mirrored
}

/** Mirror a flat list of image URLs (e.g. from DB) using wc-{id} or a synthetic folder key. */
export async function mirrorWooCommerceImageList(
  folderKey: string,
  imageUrls: string[]
): Promise<string[]> {
  return mirrorWooCommerceProductImages(folderKey, imageUrls)
}

export function wooImportMirrorPathForIndex(externalId: string, index: number, ext: string): string {
  return catalogImagePublicPath(`${wooImportMirrorRelativeDir(externalId)}/${padIndex(index)}.${ext}`)
}

/** True when URLs still point at a remote Woo store (not yet mirrored locally). */
export function hasRemoteWooStoreImageUrls(urls: string[]): boolean {
  return urls.some(
    (url) =>
      isRemoteHttpUrl(url) &&
      !isWooImportMirrorPath(url) &&
      !(isCatalogHostedImage(url) && !isRemoteHttpUrl(url))
  )
}
