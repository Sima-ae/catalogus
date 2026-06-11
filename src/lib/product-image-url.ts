/**
 * Product images live on the VPS under public_html/images → URL /images/...
 * Store and serve catalog images as site-relative paths so dev (localhost) and
 * production (superclones.cloud) both load files from the same host.
 */
import { appPath } from '@/lib/paths'
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

function toCatalogImagePath(path: string): string {
  let p = path.replace(/\\/g, '/')
  p = p.replace(/^\/?public_html\//i, '/')
  if (!p.startsWith('/')) p = `/${p}`
  if (p.startsWith('/images/')) return p
  if (p.startsWith('images/')) return `/${p}`
  return p
}

/**
 * Canonical URL for product images. Catalog /images/... paths are site-relative;
 * external URLs (Yupoo CDN, etc.) are returned unchanged.
 */
export function normalizeProductImageUrl(url: string | null | undefined): string {
  const raw = String(url ?? '').trim()
  if (!raw) return ''

  const catalogPath = extractImagePath(raw)
  if (catalogPath) {
    return toCatalogImagePath(catalogPath)
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw
  }

  if (raw.includes('/images/') || raw.startsWith('images/')) {
    return toCatalogImagePath(raw)
  }

  return raw
}

/** Browser src for catalog /images/ paths (respects basePath). External URLs unchanged. */
export function productImageSrc(url: string | null | undefined): string {
  const normalized = normalizeProductImageUrl(url)
  if (!normalized) return ''
  if (normalized.startsWith('/')) return appPath(normalized)
  return normalized
}

/** Normalize image fields before persisting to the database. */
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

/** Absolute URL when needed (emails, OG tags). Relative /images/ paths use app origin. */
export function absoluteCatalogImageUrl(url: string | null | undefined): string {
  const normalized = normalizeProductImageUrl(url)
  if (!normalized) return ''
  if (/^https?:\/\//i.test(normalized)) return normalized
  if (normalized.startsWith('/images/')) {
    const origin = (
      process.env.NEXT_PUBLIC_CATALOG_IMAGE_ORIGIN?.trim() ||
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      'https://superclones.cloud'
    ).replace(/\/$/, '')
    return `${origin}${normalized}`
  }
  return normalized
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

    // Yupoo marketing/static host — never product album photos
    if (host === 's.yupoo.com') return true

    // Platform icon folder on Yupoo CDN (logo@558.png, weibo icons, etc.)
    if (host === 'photo.yupoo.com' && path.startsWith('/icons/')) return true
    if (host.endsWith('x.yupoo.com') && path.startsWith('/icons/')) return true

    // Occasional re-uploads of the same promo icons outside /icons/
    if (/^weibo(@[\d]+x?)?\.(png|jpe?g|gif|webp)$/i.test(base)) return true
    if (/^sinaweibo(@[\d]+x?)?\.(png|jpe?g|gif|webp)$/i.test(base)) return true
    if (/^logo\d?@\d+\.(png|jpe?g|gif|webp)$/i.test(base)) return true

    return false
  } catch {
    return /photo\.yupoo\.com\/icons\//i.test(raw) || /^https?:\/\/s\.yupoo\.com\//i.test(raw)
  }
}

/** Remove Yupoo/Weibo platform icons from a URL list (product photos kept). */
export function stripBrandingGalleryImageUrls(urls: string[]): string[] {
  return urls.filter((u) => {
    const trimmed = String(u ?? '').trim()
    return trimmed && !isBrandingGalleryImageUrl(trimmed)
  })
}

/** Prefer medium/original over small/thumb Yupoo CDN paths. */
export function upgradeYupooImageUrl(url: string): string {
  let u = url.trim()
  u = u.replace(/\/small\./gi, '/medium.')
  u = u.replace(/\/thumb\./gi, '/medium.')
  u = u.replace(/\/square\./gi, '/medium.')
  u = u.replace(/\/original\./gi, '/medium.')
  return u.split('?')[0] || u
}

/** Lighter Yupoo CDN path for catalog grid cards (faster mobile loads). */
export function downgradeYupooImageUrlForCard(url: string): string {
  let u = url.trim().split('?')[0]
  u = u.replace(/\/medium\./gi, '/small.')
  u = u.replace(/\/original\./gi, '/small.')
  u = u.replace(/\/square\./gi, '/small.')
  u = u.replace(/\/thumb\./gi, '/small.')
  return u
}

/**
 * Image URL tuned for shop grid cards: smaller Yupoo variants, same paths for self-hosted /images/.
 */
export function catalogCardImageSrc(
  url: string | null | undefined,
  sourceUrl?: string | null
): string {
  const normalized = normalizeProductImageUrl(url)
  if (!normalized) return ''

  const sized = isYupooImageUrl(normalized)
    ? downgradeYupooImageUrlForCard(normalized)
    : normalized
  const display = toDisplayProductImageUrl(sized, sourceUrl)
  if (!display) return ''
  if (display.startsWith('/')) return appPath(display)
  return display
}

function unwrapDisplayImageUrl(url: string): string {
  const raw = url.trim()
  if (!raw.includes('/api/yupoo-image')) return raw
  try {
    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      process.env.NEXT_PUBLIC_CATALOG_IMAGE_ORIGIN?.trim() ||
      'https://superclones.cloud'
    const parsed = new URL(raw, origin)
    const inner = parsed.searchParams.get('url')
    return inner ? decodeURIComponent(inner) : raw
  } catch {
    return raw
  }
}

/**
 * Stable key for deduping the same photo (Yupoo small/medium/original, proxy vs raw, etc.).
 */
export function canonicalProductImageKey(url: string | null | undefined): string {
  let raw = unwrapDisplayImageUrl(String(url ?? '').trim())
  if (!raw) return ''

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

/** Keep first occurrence of each unique image (order preserved). Duplicates only — does not drop product photos. */
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

/** Strip platform icons, then dedupe same-photo variants (small/medium/thumb). */
export function cleanProductGalleryUrls(urls: string[]): string[] {
  return dedupeProductImageUrls(stripBrandingGalleryImageUrls(urls))
}

/**
 * Yupoo CDN blocks hotlinking — serve through our proxy using the album URL as Referer.
 * Raw Yupoo URLs stay in the database; this is for display only.
 */
export function toDisplayProductImageUrl(
  url: string | null | undefined,
  sourceUrl?: string | null
): string {
  const normalized = normalizeProductImageUrl(url)
  if (!normalized) return ''

  if (normalized.includes('/api/yupoo-image')) {
    return normalized
  }

  if (!isYupooImageUrl(normalized)) {
    return normalized
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

  return `/api/yupoo-image?${params.toString()}`
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

/** Main image first, then gallery URLs from DB (no placeholders/branding, deduped). */
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

/** Pick display main + gallery, promoting the next photo when main is branding. */
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

/** True when the image is served from our /images/ tree (safe for Next.js optimizer). */
export function isCatalogHostedImage(url: string | null | undefined): boolean {
  const normalized = normalizeProductImageUrl(url)
  if (!normalized) return false
  if (normalized.startsWith('/images/')) return true
  try {
    const u = new URL(normalized)
    const host = u.hostname.toLowerCase()
    return (
      (host.includes('superclones.cloud') || host === 'localhost' || host === '127.0.0.1') &&
      u.pathname.includes('/images/')
    )
  } catch {
    return normalized.includes('/images/')
  }
}

/** External CDN URLs (Yupoo etc.) must bypass the Next.js image optimizer. */
export function shouldUnoptimizeProductImage(url: string | null | undefined): boolean {
  const raw = String(url ?? '').trim()
  if (raw.includes('/api/yupoo-image')) return true
  if (isYupooImageUrl(raw)) return true
  return !isCatalogHostedImage(url)
}
