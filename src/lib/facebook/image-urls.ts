/** Shared helpers for picking real post photos vs Facebook UI assets. */

export function unescapeFacebookUrl(raw: string): string {
  return raw
    .replace(/\\\//g, '/')
    .replace(/\\u0026/g, '&')
    .replace(/&amp;/g, '&')
    .trim()
}

export function facebookImageAssetId(url: string): string | null {
  const match = url.match(/\/(\d+_\d+_\d+)_n\.(?:jpg|jpeg|png|webp)/i)
  return match?.[1] ?? null
}

export function isLikelyProductImageUrl(url: string): boolean {
  const lower = unescapeFacebookUrl(url).toLowerCase()
  if (!/^https?:\/\//i.test(lower)) return false
  if (lower.includes('rsrc.php')) return false
  if (lower.includes('/emoji.php')) return false
  if (!lower.includes('scontent') && !lower.includes('fbcdn.net')) return false
  // Default anonymous / logged-out avatar CDN path — not the post photo.
  if (lower.includes('t1.30497-1/')) return false
  if (lower.includes('85215299_479381239411958')) return false
  // Tiny avatars / icons.
  if (/[?&]stp=c\d+\.0\.\d+x\d+/i.test(lower) && /s\d+x\d+/i.test(lower)) return false
  if (/[?&]_nc_tp=6\b/i.test(lower)) return false
  return true
}

export function dedupeFacebookImageUrls(urls: string[]): string[] {
  const out: string[] = []
  const seenAssets = new Set<string>()
  const seenUrls = new Set<string>()

  for (const raw of urls) {
    const url = unescapeFacebookUrl(raw)
    if (!url || seenUrls.has(url)) continue
    if (!isLikelyProductImageUrl(url)) continue

    const assetId = facebookImageAssetId(url)
    if (assetId) {
      if (seenAssets.has(assetId)) continue
      seenAssets.add(assetId)
    }

    seenUrls.add(url)
    out.push(url)
  }

  return out
}
