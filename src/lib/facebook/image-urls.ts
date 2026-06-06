/** Shared helpers for picking real post photos vs Facebook UI assets. */

export function unescapeFacebookUrl(raw: string): string {
  return raw
    .replace(/\\\//g, '/')
    .replace(/\\u0026/g, '&')
    .replace(/&amp;/g, '&')
    .trim()
}

export function facebookImageAssetId(url: string): string | null {
  const match = unescapeFacebookUrl(url).match(/\/(\d+_\d+_\d+)_n\.(?:jpg|jpeg|png|webp)/i)
  return match?.[1] ?? null
}

/** Estimate pixel area from Facebook CDN query params (cstp/stp/ctp). */
export function estimateFacebookImagePixels(url: string): number {
  const u = unescapeFacebookUrl(url)
  let area = 0

  const cstp = u.match(/[?&]cstp=mx(\d+)x(\d+)/i)
  if (cstp) {
    area = parseInt(cstp[1], 10) * parseInt(cstp[2], 10)
  }

  const ctp = u.match(/[?&]ctp=p(\d+)x(\d+)/i)
  if (ctp) {
    const capped = parseInt(ctp[1], 10) * parseInt(ctp[2], 10)
    area = area ? Math.min(area, capped) : capped
  }

  if (!area) {
    const stpCrop = u.match(/[?&]stp=c(\d+)\.0\.(\d+)x(\d+)/i)
    if (stpCrop) {
      area = parseInt(stpCrop[2], 10) * parseInt(stpCrop[3], 10)
    }
  }

  if (!area) {
    if (u.includes('t39.30808-6/') || u.includes('t39.30808-6.')) return 2_500_000
    if (u.includes('t39.30808-1/') || u.includes('t39.30808-1.')) return 400_000
    return 250_000
  }

  return area
}

/** Drop Facebook preview cap (ctp) while keeping signed CDN params (stp/cstp/_nc_*). */
export function maximizeFacebookImageUrl(url: string): string {
  const raw = unescapeFacebookUrl(url)
  if (!raw.includes('scontent') && !raw.includes('fbcdn.net')) return raw

  try {
    const parsed = new URL(raw)
    parsed.searchParams.delete('ctp')
    return parsed.href
  } catch {
    return raw
  }
}

export function isLikelyProductImageUrl(url: string): boolean {
  const lower = unescapeFacebookUrl(url).toLowerCase()
  if (!/^https?:\/\//i.test(lower)) return false
  if (lower.includes('rsrc.php')) return false
  if (lower.includes('/emoji.php')) return false
  if (!lower.includes('scontent') && !lower.includes('fbcdn.net')) return false
  if (lower.includes('t1.30497-1/')) return false
  if (lower.includes('85215299_479381239411958')) return false
  if (/[?&]stp=c\d+\.0\.\d+x\d+/i.test(lower) && /s\d+x\d+/i.test(lower)) return false
  if (/[?&]_nc_tp=6\b/i.test(lower)) return false

  if (estimateFacebookImagePixels(url) < 200 * 200) return false

  return true
}

function pickBestFacebookImageVariant(a: string, b: string): string {
  const maxA = maximizeFacebookImageUrl(a)
  const maxB = maximizeFacebookImageUrl(b)
  const areaA = estimateFacebookImagePixels(maxA)
  const areaB = estimateFacebookImagePixels(maxB)
  return areaB > areaA ? maxB : maxA
}

/** Keep the largest CDN variant per photo asset. */
export function dedupeFacebookImageUrls(urls: string[]): string[] {
  const byAsset = new Map<string, string>()

  for (const raw of urls) {
    const url = unescapeFacebookUrl(raw)
    if (!url || !isLikelyProductImageUrl(url)) continue

    const assetId = facebookImageAssetId(url) || url
    const existing = byAsset.get(assetId)
    byAsset.set(
      assetId,
      existing ? pickBestFacebookImageVariant(existing, url) : maximizeFacebookImageUrl(url)
    )
  }

  return Array.from(byAsset.values()).sort(
    (a, b) => estimateFacebookImagePixels(b) - estimateFacebookImagePixels(a)
  )
}

/** Read JPEG width/height from buffer (first SOF marker). */
export function readJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null

  let offset = 2
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) break
    const marker = buffer[offset + 1]
    const length = buffer.readUInt16BE(offset + 2)
    if (marker === 0xc0 || marker === 0xc2) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      }
    }
    offset += 2 + length
  }

  return null
}
