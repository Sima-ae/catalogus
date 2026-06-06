import {
  catalogImagePublicPath,
  clearCatalogImageDirectory,
  writeCatalogImageFile,
} from '@/lib/catalog-image-storage'
import {
  cleanProductGalleryUrls,
  isCatalogHostedImage,
  normalizeProductImageUrl,
} from '@/lib/product-image-url'
import { fetchFacebookRemoteUrl } from '@/lib/facebook/client'

const MAX_BYTES = 12 * 1024 * 1024
const MIRROR_SUBDIR = 'imports/facebook'

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
  if (!safe) throw new Error('Facebook external id is required to mirror images')
  return safe
}

export function facebookImportMirrorRelativeDir(externalId: string): string {
  return `${MIRROR_SUBDIR}/${sanitizeExternalId(externalId)}`
}

export function isFacebookImportMirrorPath(url: string | null | undefined): boolean {
  const raw = String(url ?? '').trim()
  if (!raw) return false
  try {
    const path = raw.startsWith('http') ? new URL(raw).pathname : raw
    return path.includes(`/images/${MIRROR_SUBDIR}/`)
  } catch {
    return raw.includes(`/images/${MIRROR_SUBDIR}/`) || raw.includes(`${MIRROR_SUBDIR}/`)
  }
}

function isRemoteHttpUrl(url: string): boolean {
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
  const res = await fetchFacebookRemoteUrl(url, {
    headers: {
      Accept: 'image/*,*/*;q=0.8',
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

/** Download Facebook post images to /images/imports/facebook/{externalId}/ on the VPS. */
export async function mirrorFacebookPostImages(
  externalId: string,
  imageUrls: string[]
): Promise<string[]> {
  const cleaned = cleanProductGalleryUrls(imageUrls)
  if (!cleaned.length) return []

  const productDir = facebookImportMirrorRelativeDir(externalId)
  const remoteUrls = cleaned.filter((url) => isRemoteHttpUrl(url) && !isFacebookImportMirrorPath(url))

  if (remoteUrls.length) {
    await clearCatalogImageDirectory(productDir)
  }

  const mirrored: string[] = []
  let downloadIndex = 0

  for (const url of cleaned) {
    if (isFacebookImportMirrorPath(url)) {
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

    downloadIndex++
    const { buffer, contentType } = await downloadRemoteImage(url)
    const ext = resolveImageExtension(contentType, url)
    const relativeFile = `${productDir}/${padIndex(downloadIndex)}.${ext}`
    const localUrl = await writeCatalogImageFile(relativeFile, buffer)
    mirrored.push(localUrl)
  }

  return mirrored
}
