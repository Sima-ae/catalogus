export const PRODUCTS_FULLTEXT_INDEX = 'ft_products_search'

function escapeFulltextToken(token: string): string {
  return token.replace(/[+\-><()~*\"@]+/g, ' ').trim()
}

/** Build a BOOLEAN MODE query — prefix match per word (min 2 chars). */
export function fulltextBooleanSearchTerm(searchTerm: string): string | null {
  const tokens = searchTerm
    .trim()
    .split(/\s+/)
    .map(escapeFulltextToken)
    .filter((t) => t.length >= 2)
  if (!tokens.length) return null
  return tokens.map((t) => `+${t}*`).join(' ')
}

export type ProductSearchFilterOptions = {
  includeBrandJoin?: boolean
  includeCategoryJoin?: boolean
  useFulltext?: boolean
}

/**
 * Product search — FULLTEXT when index exists, otherwise legacy LIKE scan.
 * Server callers should pass useFulltext from productsFulltextSearchAvailable().
 */
export function buildProductSearchFilter(
  searchTerm: string,
  options: ProductSearchFilterOptions = {}
): { sql: string; params: unknown[] } {
  const trimmed = searchTerm.trim()
  if (!trimmed) return { sql: '1 = 1', params: [] }

  if (options.useFulltext) {
    const booleanTerm = fulltextBooleanSearchTerm(trimmed)
    if (booleanTerm) {
      const parts = [
        'MATCH(p.name, p.sku, p.brand, p.short_description, p.category) AGAINST (? IN BOOLEAN MODE)',
      ]
      const params: unknown[] = [booleanTerm]
      if (options.includeBrandJoin) {
        parts.push('b.name LIKE ?')
        params.push(`%${trimmed}%`)
      }
      if (options.includeCategoryJoin) {
        parts.push('c.name LIKE ?')
        params.push(`%${trimmed}%`)
      }
      parts.push('p.tags LIKE ?')
      params.push(`%${trimmed}%`)
      return { sql: `(${parts.join(' OR ')})`, params }
    }
  }

  const like = `%${trimmed}%`
  const searchParts = [
    'p.name LIKE ?',
    'p.sku LIKE ?',
    'p.brand LIKE ?',
    'p.description LIKE ?',
    'p.short_description LIKE ?',
    'p.category LIKE ?',
    'p.tags LIKE ?',
  ]
  const params: unknown[] = [like, like, like, like, like, like, like]
  if (options.includeCategoryJoin) {
    searchParts.push('c.name LIKE ?')
    params.push(like)
  }
  if (options.includeBrandJoin) {
    searchParts.push('b.name LIKE ?')
    params.push(like)
  }
  return { sql: `(${searchParts.join(' OR ')})`, params }
}
