import {
  dedupeFacebookImageUrls,
  isLikelyProductImageUrl,
  maximizeFacebookImageUrl,
  unescapeFacebookUrl,
} from '@/lib/facebook/image-urls'

/** Numeric post id from embedded JSON (carousel / permalink posts). */
export function extractFacebookPostIdFromHtml(html: string): string | null {
  const patterns = [
    /top_level_post_id\\":\\"(\d+)\\"/,
    /"top_level_post_id":"(\d+)"/,
    /post_id\\":\\"(\d+)\\"/,
    /"post_id":"(\d+)"/,
  ]
  for (const re of patterns) {
    const match = html.match(re)
    if (match?.[1]) return match[1]
  }
  return null
}

/** Album id from photo links (`set=a.{albumId}`) — used to fetch all carousel photos via Graph. */
export function extractFacebookAlbumIdFromHtml(html: string): string | null {
  const match = html.match(/set=a\.(\d{10,})/i)
  return match?.[1] ?? null
}

/** Full-size URIs from carousel JSON (`viewer_image` = largest variant). */
export function extractViewerImageUrlsFromHtml(html: string): string[] {
  const urls: string[] = []
  let searchFrom = 0

  while (searchFrom < html.length) {
    const idx = html.indexOf('viewer_image', searchFrom)
    if (idx < 0) break

    const chunk = html.slice(idx, idx + 1600)
    const uriMatch =
      chunk.match(/\\"uri\\":\\"(https:[^\\"]+)\\"/) ||
      chunk.match(/"uri":"(https:[^"]+)"/)
    if (uriMatch?.[1]) {
      urls.push(maximizeFacebookImageUrl(unescapeFacebookUrl(uriMatch[1])))
    }

    searchFrom = idx + 12
  }

  return dedupeFacebookImageUrls(urls.filter(isLikelyProductImageUrl))
}

/** Reported carousel size from `all_subattachments.count` (may exceed inline nodes). */
export function extractFacebookSubattachmentCountFromHtml(html: string): number | null {
  const match = html.match(/all_subattachments[^}]*"count":(\d+)/)
  if (!match?.[1]) return null
  const n = parseInt(match[1], 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function extractFacebookIdsFromHtml(html: string): {
  postId: string | null
  albumId: string | null
  subattachmentCount: number | null
} {
  return {
    postId: extractFacebookPostIdFromHtml(html),
    albumId: extractFacebookAlbumIdFromHtml(html),
    subattachmentCount: extractFacebookSubattachmentCountFromHtml(html),
  }
}
