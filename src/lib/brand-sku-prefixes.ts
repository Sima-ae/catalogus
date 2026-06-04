import { queryDb } from '@/lib/db'
import { brandSkuPrefix } from '@/lib/product-sku'

let cachedPrefixes: string[] | null = null

/** All brand slugs used in legacy SKUs, longest first (for correct multi-word brands). */
export async function getBrandSkuPrefixes(): Promise<string[]> {
  if (cachedPrefixes) return cachedPrefixes
  try {
    const rows = await queryDb<{ name: string }[]>(
      `SELECT DISTINCT name FROM brands WHERE name IS NOT NULL AND TRIM(name) <> ''`
    )
    const prefixes = Array.from(
      new Set(rows.map((r) => brandSkuPrefix(r.name)).filter(Boolean))
    ).sort((a, b) => b.length - a.length)
    cachedPrefixes = prefixes
    return prefixes
  } catch {
    return []
  }
}

export function getBrandSkuPrefixesCached(): string[] {
  return cachedPrefixes ?? []
}

export function clearBrandSkuPrefixesCache(): void {
  cachedPrefixes = null
}
