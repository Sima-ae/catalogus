/**
 * Catalog import images are stored on disk under public/images/ → URL /images/...
 * DB keeps site-relative paths (/images/imports/...). The browser loads them from
 * whatever host serves the page (localhost or superclones.cloud).
 */
import { appPath } from '@/lib/paths'

const DEFAULT_CATALOG_ORIGIN = 'https://superclones.cloud'

/** Public origin when an absolute catalog URL is required (emails, OG tags). */
export function catalogImageOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_CATALOG_IMAGE_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    DEFAULT_CATALOG_ORIGIN
  ).replace(/\/$/, '')
}

function extractImagePath(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed)
      const path = u.pathname + u.search
      const host = u.hostname.toLowerCase()
      const isOurSite =
        host.includes('superclones.cloud') ||
        host === 'localhost' ||
        host === '127.0.0.1'
      if (isOurSite && path.includes('/images/')) {
        return path
      }
      return null
    } catch {
      return null
    }
  }

  if (trimmed.includes('/images/') || trimmed.startsWith('images/')) {
    return trimmed
  }

  return null
}

/** Canonical site-relative path, e.g. /images/imports/woocommerce/wc-3693/001.jpg */
function toCatalogRelativePath(path: string): string {
  let p = path.replace(/\\/g, '/')
  p = p.replace(/^\/?public_html\//i, '/')
  if (!p.startsWith('/')) p = `/${p}`
  if (p.startsWith('images/')) p = `/${p}`
  return p
}

/**
 * Normalize for DB storage. Catalog paths → /images/... ; external URLs unchanged.
 */
export function normalizeProductImageUrl(url: string | null | undefined): string {
  const raw = String(url ?? '').trim()
  if (!raw) return ''

  const catalogPath = extractImagePath(raw)
  if (catalogPath) {
    return toCatalogRelativePath(catalogPath)
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw
  }

  if (raw.includes('/images/') || raw.startsWith('images/')) {
    return toCatalogRelativePath(raw)
  }

  return raw
}

/** Full public URL — only when absolute is required outside the browser. */
export function absoluteCatalogImageUrl(url: string | null | undefined): string {
  const relative = normalizeProductImageUrl(url)
  if (!relative) return ''
  if (relative.startsWith('/images/')) {
    return `${catalogImageOrigin()}${relative}`
  }
  return relative
}

export function isYupooImageUrl(url: string | null | undefined): boolean {
  const raw = String(url ?? '').trim()
  if (!raw) return false
  try {
    return new URL(raw).hostname.toLowerCase().endsWith('yupoo.com')
  } catch {
    return /yupoo\.com/i.test(raw)
  }
}

/** Yupoo platform icons only (green-dots logo, Weibo badge) — not product photos. */
export function isBrandingGalleryImageUrl(url: string | null | undefined): boolean {
  const raw = unwrapDisplayImageUrl(String(url ?? '').trim())
  if (!raw) return false

  try {
    const u = new URL(raw)
    const host = u.hostname.toLowerCase()
    const path = u.pathname.toLowerCase()
    const base = path.split('/').pop() || ''

    if (host === 's.yupoo.com') return true
    if (host === 'photo.yupoo.com' && path.startsWith('/icons/')) return true
    if (host.endsWith('x.yupoo.com') && path.startsWith('/icons/')) return true
    if (/^weibo(@[\d]+x?)?\.(png|jpe?g|gif|webp)$/i.test(base)) return true
    if (/^sinaweibo(@[\d]+x?)?\.(png|jpe?g|gif|webp)$/i.test(base)) return true
    if (/^logo\d?@\d+\.(png|jpe?g|gif|webp)$/i.test(base)) return true

    return false
  } catch {
    return /photo\.yupoo\.com\/icons\//i.test(raw) || /^https?:\/\/s\.yupoo\.com\//i.test(raw)
  }
}

export function stripBrandingGalleryImageUrls(urls: string[]): string[] {
  return urls.filter((u) => {
    const trimmed = String(u ?? '').trim()
    return trimmed && !isBrandingGalleryImageUrl(trimmed)
  })
}

export function upgradeYupooImageUrl(url: string): string {
  let u = url.trim()
  u = u.replace(/\/small\./gi, '/medium.')
  u = u.replace(/\/thumb\./gi, '/medium.')
  u = u.replace(/\/square\./gi, '/medium.')
  u = u.replace(/\/original\./gi, '/medium.')
  return u.split('?')[0] || u
}

function unwrapDisplayImageUrl(url: string): string {
  const raw = url.trim()
  if (!raw.includes('/api/yupoo-image')) return raw
  try {
    const parsed = new URL(raw, catalogImageOrigin())
    const inner = parsed.searchParams.get('url')
    return inner ? decodeURIComponent(inner) : raw
  } catch {
    return raw
  }
}

export function canonicalProductImageKey(url: string | null | undefined): string {
  let raw = unwrapDisplayImageUrl(String(url ?? '').trim())
  if (!raw) return ''

  const catalogPath = extractImagePath(raw)
  if (catalogPath) {
    return catalogPath.toLowerCase().split('?')[0] || ''
  }

  raw = normalizeProductImageUrl(raw)
  if (isYupooImageUrl(raw)) {
    raw = upgradeYupooImageUrl(raw)
  }

  try {
    const u = new URL(raw)
    const host = u.hostname.toLowerCase()
    let path = u.pathname.replace(/\/+$/, '')
    path = path.replace(/\/(small|thumb|square|original)\./gi, '/medium.')
    return `${host}${path}`
  } catch {
    return raw.toLowerCase().split('?')[0] || ''
  }
}

export function dedupeProductImageUrls(urls: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const url of urls) {
    const trimmed = String(url ?? '').trim()
    if (!trimmed || isPlaceholderImageUrl(trimmed)) continue
    const key = canonicalProductImageKey(trimmed)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

export function cleanProductGalleryUrls(urls: string[]): string[] {
  return dedupeProductImageUrls(stripBrandingGalleryImageUrls(urls))
}

export function toDisplayProductImageUrl(
  url: string | null | undefined,
  sourceUrl?: string | null
): string {
  const normalized = normalizeProductImageUrl(url)
  if (!normalized) return ''

  if (normalized.includes('/api/yupoo-image')) {
    return productImageSrc(normalized)
  }

  if (!isYupooImageUrl(normalized)) {
    return productImageSrc(normalized)
  }

  const params = new URLSearchParams({ url: normalized })
  const ref = String(sourceUrl ?? '').trim()
  if (ref) {
    try {
      if (new URL(ref).hostname.toLowerCase().endsWith('yupoo.com')) {
        params.set('ref', ref)
      }
    } catch {
      /* ignore invalid ref */
    }
  }

  return productImageSrc(`/api/yupoo-image?${params.toString()}`)
}

export function toDisplayProductImageList(
  urls: string[] | null | undefined,
  sourceUrl?: string | null
): string[] | null {
  if (!urls?.length) return null
  const out = dedupeProductImageUrls(
    urls
      .map((u) => toDisplayProductImageUrl(u, sourceUrl))
      .filter((u) => Boolean(u))
  )
  return out.length ? out : null
}

export function isPlaceholderImageUrl(url: string | null | undefined): boolean {
  const u = String(url ?? '').trim().toLowerCase()
  if (!u) return true
  return (
    u.includes('picsum.photos') ||
    u.includes('via.placeholder.com') ||
    u.includes('placeholder.com') ||
    u.includes('placehold.co') ||
    u.includes('loremflickr.com')
  )
}

export function normalizeProductImageList(
  urls: string[] | null | undefined
): string[] | null {
  if (!urls?.length) return null
  const out = dedupeProductImageUrls(
    urls
      .map((u) => normalizeProductImageUrl(u))
      .map((u) => (isYupooImageUrl(u) ? upgradeYupooImageUrl(u) : u))
      .filter((u) => u && !isPlaceholderImageUrl(u))
  )
  return out.length ? out : null
}

export function buildProductGallery(
  mainImageRaw: string | null | undefined,
  galleryRaw: string[] | null | undefined
): string[] {
  const mainImage = String(mainImageRaw ?? '').trim()
  const ordered = [
    ...(mainImage && !isPlaceholderImageUrl(mainImage) ? [mainImage] : []),
    ...(galleryRaw ?? [])
      .map((u) => String(u ?? '').trim())
      .filter((u) => u && !isPlaceholderImageUrl(u)),
  ]
  return cleanProductGalleryUrls(ordered)
}

export function resolveProductDisplayImages(
  mainImageRaw: string | null | undefined,
  galleryRaw: string[] | null | undefined,
  sourceUrl?: string | null
): { main: string; gallery: string[] | null } {
  const rawMain = String(mainImageRaw ?? '').trim()
  const rawGallery = galleryRaw ?? []
  const combined = buildProductGallery(rawMain, rawGallery)
  const main = combined[0] ? toDisplayProductImageUrl(combined[0], sourceUrl) : ''
  const gallery = combined.slice(1).map((u) => toDisplayProductImageUrl(u, sourceUrl))
  const dedupedGallery = dedupeProductImageUrls(gallery)
  return {
    main,
    gallery: dedupedGallery.length ? dedupedGallery : null,
  }
}

export function isCatalogHostedImage(url: string | null | undefined): boolean {
  const raw = String(url ?? '').trim()
  if (!raw) return false
  if (extractImagePath(raw)) return true
  try {
    const u = new URL(raw)
    const host = u.hostname.toLowerCase()
    return (
      (host.includes('superclones.cloud') || host === 'localhost' || host === '127.0.0.1') &&
      u.pathname.includes('/images/')
    )
  } catch {
    return raw.includes('/images/')
  }
}

/** Browser img src — same-origin /images/... for catalog files; external URLs unchanged. */
export function productImageSrc(url: string | null | undefined): string {
  const raw = String(url ?? '').trim()
  if (!raw) return ''

  if (raw.includes('/api/yupoo-image')) {
    return appPath(raw.startsWith('/') ? raw : `/${raw}`)
  }

  const catalogPath = extractImagePath(raw)
  if (catalogPath) {
    return appPath(toCatalogRelativePath(catalogPath))
  }

  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('/')) return appPath(raw)
  return raw
}

export function normalizeProductImagesForStorage(input: {
  image_url?: string | null
  gallery_images?: string[] | null
}): { image_url: string; gallery_images: string[] | null } {
  const main = normalizeProductImageUrl(input.image_url)
  const gallery = normalizeProductImageList(input.gallery_images)
  return {
    image_url: main,
    gallery_images: gallery,
  }
}

export function shouldUnoptimizeProductImage(url: string | null | undefined): boolean {
  const raw = String(url ?? '').trim()
  if (!raw) return true
  if (raw.includes('/api/yupoo-image')) return true
  if (isYupooImageUrl(raw)) return true
  if (isCatalogHostedImage(url)) return true
  return !/^https?:\/\//i.test(raw)
}
