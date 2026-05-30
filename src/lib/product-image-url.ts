/**
 * Product images live on the VPS under public_html/images → URL /images/...
 * Always use the public site origin for these paths (not localhost in dev).
 */
const CATALOG_IMAGE_ORIGIN = (
  process.env.NEXT_PUBLIC_CATALOG_IMAGE_ORIGIN?.trim() || 'https://superclones.cloud'
).replace(/\/$/, '')

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

  return trimmed
}

function normalizeProductImagePath(path: string, origin: string): string {
  let p = path.replace(/\\/g, '/')
  p = p.replace(/^\/?public_html\//i, '/')
  if (!p.startsWith('/')) p = `/${p}`
  if (p.startsWith('/images/')) return `${origin}${p}`
  if (p.startsWith('images/')) return `${origin}/${p}`
  return `${origin}${p}`
}

/**
 * Canonical public URL for catalog images (/images/... on superclones.cloud).
 * External URLs (e.g. picsum.photos) are returned unchanged.
 */
export function normalizeProductImageUrl(url: string | null | undefined): string {
  const raw = String(url ?? '').trim()
  if (!raw) return ''

  const catalogPath = extractImagePath(raw)
  if (catalogPath) {
    return normalizeProductImagePath(catalogPath, CATALOG_IMAGE_ORIGIN)
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw
  }

  if (raw.includes('/images/') || raw.startsWith('images/')) {
    return normalizeProductImagePath(raw, CATALOG_IMAGE_ORIGIN)
  }

  return raw
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
  const out = urls
    .map((u) => toDisplayProductImageUrl(u, sourceUrl))
    .filter((u) => u && !isPlaceholderImageUrl(u))
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
  const out = urls
    .map((u) => normalizeProductImageUrl(u))
    .filter((u) => u && !isPlaceholderImageUrl(u))
  return out.length ? out : null
}

/** Main image first, then gallery URLs from DB (no placeholders, deduped). */
export function buildProductGallery(
  mainImageRaw: string | null | undefined,
  galleryRaw: string[] | null | undefined
): string[] {
  const mainImage = String(mainImageRaw ?? '').trim()
  const extras = (galleryRaw ?? [])
    .map((u) => String(u ?? '').trim())
    .filter((u) => u && !isPlaceholderImageUrl(u) && u !== mainImage)

  const gallery: string[] = []
  if (mainImage && !isPlaceholderImageUrl(mainImage)) {
    gallery.push(mainImage)
  }
  for (const url of extras) {
    if (!gallery.includes(url)) gallery.push(url)
  }
  return gallery
}

/** True when the image is served from our /images/ tree (safe for Next.js optimizer). */
export function isCatalogHostedImage(url: string | null | undefined): boolean {
  const normalized = normalizeProductImageUrl(url)
  if (!normalized) return false
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
