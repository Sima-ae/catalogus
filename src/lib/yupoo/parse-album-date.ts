/** Normalize Yupoo date strings (ISO or YYYY/M/D) to YYYY-MM-DD. */
export function normalizeYupooAlbumDate(raw: string | null | undefined): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const slash = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/)
  if (slash) {
    return `${slash[1]}-${String(slash[2]).padStart(2, '0')}-${String(slash[3]).padStart(2, '0')}`
  }

  return null
}

/** Read ImageGallery datePublished from Yupoo album HTML (schema.org JSON-LD). */
export function parseYupooAlbumDateFromHtml(html: string): string | null {
  const blocks =
    html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ??
    []

  for (const block of blocks) {
    const jsonText = block
      .replace(/^<script[^>]*>/i, '')
      .replace(/<\/script>$/i, '')
      .trim()
    if (!jsonText) continue

    try {
      const parsed = JSON.parse(jsonText) as unknown
      const items = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of items) {
        if (!item || typeof item !== 'object') continue
        const record = item as Record<string, unknown>
        if (record['@type'] !== 'ImageGallery') continue
        const normalized = normalizeYupooAlbumDate(String(record.datePublished ?? ''))
        if (normalized) return normalized
      }
    } catch {
      // try next block
    }
  }

  const fallback = html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})"/)
  return fallback?.[1] ?? null
}
