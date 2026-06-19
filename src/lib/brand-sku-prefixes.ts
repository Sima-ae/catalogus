import { queryDb } from '@/lib/db'
import { brandSkuPrefix } from '@/lib/product-sku'

let cachedPrefixes: string[] | null = null
let cachedBrandNames: string[] | null = null

async function loadBrandNameRows(): Promise<{ name: string }[]> {
  return queryDb<{ name: string }[]>(
    `SELECT DISTINCT name FROM brands WHERE active = 1 AND name IS NOT NULL AND TRIM(name) <> ''`
  ).catch(() => [] as { name: string }[])
}

/** All active brand display names (longest letter-keys first). */
export async function getAllBrandNames(): Promise<string[]> {
  if (cachedBrandNames) return cachedBrandNames
  const rows = await loadBrandNameRows()
  const names = Array.from(new Set(rows.map((r) => String(r.name).trim()).filter(Boolean))).sort(
    (a, b) => b.length - a.length
  )
  cachedBrandNames = names
  return names
}

/** All brand slugs used in legacy SKUs, longest first (for correct multi-word brands). */
export async function getBrandSkuPrefixes(): Promise<string[]> {
  if (cachedPrefixes) return cachedPrefixes
  try {
    const rows = await loadBrandNameRows()
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
  cachedBrandNames = null
}
