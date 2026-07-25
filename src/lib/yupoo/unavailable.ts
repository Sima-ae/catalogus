import { createHash } from 'crypto'

/**
 * Yupoo / supplier “gone” signals — album deleted or CDN serves the
 * “image temporarily unavailable” placeholder graphic.
 */

/** SHA-256 of known Yupoo CDN placeholder PNGs (图片暂时无法展示). */
export const YUPOO_UNAVAILABLE_IMAGE_SHA256 = new Set<string>([
  // wholesale1819 large/medium “图片暂时无法展示” (470×380, ~17KB)
  'c40fff23302bf779252e28d3177eb9482f27770aee176011bf73de0390457ddf',
])

export function sha256Hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}

/** True when the CDN body is Yupoo’s fixed “image unavailable” placeholder. */
export function isYupooUnavailablePlaceholderImage(body: Buffer): boolean {
  if (!body?.length) return true
  // Fast path: exact known placeholder hashes
  if (YUPOO_UNAVAILABLE_IMAGE_SHA256.has(sha256Hex(body))) return true
  return false
}

/**
 * Upstream fetch returned something that is not a usable product photo
 * (S3 NoSuchKey XML, HTML error page, empty body, known placeholder).
 */
export function isYupooUnavailableImagePayload(
  body: Buffer,
  contentType: string | null | undefined
): boolean {
  if (!body?.length) return true
  const ct = String(contentType ?? '').toLowerCase()

  if (ct.includes('xml') || ct.includes('text/html') || ct.includes('application/json')) {
    return true
  }

  const head = body.subarray(0, Math.min(body.length, 512)).toString('utf8')
  if (
    /<\s*Error\b/i.test(head) ||
    /NoSuchKey/i.test(head) ||
    /<\s*!DOCTYPE\s+html/i.test(head) ||
    /<\s*html\b/i.test(head)
  ) {
    return true
  }

  // JPEG/PNG magic — reject non-images even when Content-Type lies
  const isJpeg = body[0] === 0xff && body[1] === 0xd8
  const isPng =
    body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47
  const isGif = body[0] === 0x47 && body[1] === 0x49 && body[2] === 0x46
  const isWebp =
    body.length >= 12 &&
    body[0] === 0x52 &&
    body[1] === 0x49 &&
    body[2] === 0x46 &&
    body[3] === 0x46 &&
    body[8] === 0x57 &&
    body[9] === 0x45 &&
    body[10] === 0x42 &&
    body[11] === 0x50
  if (!isJpeg && !isPng && !isGif && !isWebp) return true

  if (isYupooUnavailablePlaceholderImage(body)) return true

  // Tiny “images” are almost never real product photos
  if (body.length < 800) return true

  return false
}

/** Album / category HTML that means the supplier page is gone. */
export function isYupooUnavailableAlbumHtml(html: string | null | undefined): boolean {
  const raw = String(html ?? '')
  if (!raw.trim()) return true
  const h = raw.toLowerCase()

  if (h.includes('notfound__main') || h.includes('notfound__title')) return true
  if (h.includes('imgs/notaccess/im_404')) return true

  // Chinese + English copy Yupoo uses for deleted albums / missing pages
  if (raw.includes('该相册已不存在')) return true
  if (raw.includes('页面未找到')) return true
  if (raw.includes('图片暂时无法展示')) return true
  if (/this album is not exist/i.test(raw)) return true
  if (/this album (?:does )?not exist/i.test(raw)) return true
  if (/album (?:is )?not found/i.test(raw)) return true

  return false
}

export type SourceAvailability =
  | { ok: true }
  | { ok: false; reason: string }

/** Classify a fetched album/product page (any import source). */
export function classifySourcePageAvailability(input: {
  status?: number | null
  html?: string | null
  imageCount?: number | null
  hostHint?: string | null
}): SourceAvailability {
  const status = input.status ?? null
  const html = String(input.html ?? '')
  const host = String(input.hostHint ?? '').toLowerCase()
  const isYupoo = host.includes('yupoo.com') || /yupoo\.com/i.test(html.slice(0, 2000))

  if (status === 404 || status === 410 || status === 451) {
    return { ok: false, reason: `source_http_${status}` }
  }

  if (isYupoo && isYupooUnavailableAlbumHtml(html)) {
    return { ok: false, reason: 'yupoo_album_not_found' }
  }

  // Generic 404 pages from other suppliers
  if (
    /<title[^>]*>\s*404\b/i.test(html) ||
    /\bpage not found\b/i.test(html) ||
    /\bproduct not found\b/i.test(html) ||
    /\bthis page (?:isn'?t|is not) available\b/i.test(html)
  ) {
    return { ok: false, reason: 'source_page_not_found' }
  }

  if (typeof input.imageCount === 'number' && input.imageCount <= 0) {
    // Empty galleries on Yupoo almost always mean deleted/locked content after gate check.
    if (isYupoo) return { ok: false, reason: 'yupoo_no_images' }
  }

  return { ok: true }
}
