import type { CatalogMode } from '@/lib/catalog'

export type CatalogSortScopeInput = {
  mode?: CatalogMode
  category?: string
  subcategory?: string
  brand?: string
  tag?: string
  search?: string
}

function scopeToken(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '_')
}

/** Stable key for manual catalog sort order (null = search results, no custom order). */
export function catalogSortScope(input: CatalogSortScopeInput): string | null {
  if (input.search?.trim() || input.tag?.trim()) return null

  if (input.mode === 'new') return 'new'

  const parts: string[] = []

  if (input.brand && input.brand !== 'All') {
    parts.push(`brand:${scopeToken(input.brand)}`)
  }

  if (
    input.subcategory &&
    input.subcategory !== 'All' &&
    input.category &&
    input.category !== 'All'
  ) {
    parts.push(
      `sub:${scopeToken(input.category)}:${scopeToken(input.subcategory)}`
    )
  } else if (input.category && input.category !== 'All') {
    parts.push(`cat:${scopeToken(input.category)}`)
  }

  return parts.length ? parts.join('+') : 'global'
}
