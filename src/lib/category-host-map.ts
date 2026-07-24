/** Host → default shop category (e.g. watches.superclones.cloud → WATCHES). */
export type CategoryHostMapping = {
  host: string
  category: string
}

/**
 * Parse CATEGORY_HOST_MAP env:
 *   watches.superclones.cloud:WATCHES,perfumes.superclones.cloud:PERFUMES
 */
export function parseCategoryHostMap(
  raw: string | null | undefined
): CategoryHostMapping[] {
  const text = String(raw ?? '').trim()
  if (!text) return []

  const out: CategoryHostMapping[] = []
  for (const part of text.split(',')) {
    const entry = part.trim()
    if (!entry) continue
    const colon = entry.lastIndexOf(':')
    if (colon <= 0) continue
    const host = entry.slice(0, colon).trim().toLowerCase()
    const category = entry.slice(colon + 1).trim()
    if (!host || !category) continue
    out.push({ host, category })
  }
  return out
}

export function resolveCategoryForHost(
  hostname: string | null | undefined,
  map: CategoryHostMapping[] = parseCategoryHostMap(process.env.CATEGORY_HOST_MAP)
): string | null {
  const host = String(hostname ?? '')
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '')
  if (!host || !map.length) return null
  const hit = map.find((row) => row.host === host)
  return hit?.category ?? null
}
