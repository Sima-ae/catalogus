export const PRODUCTS_FULLTEXT_INDEX = 'ft_products_search'

/**
 * Common MySQL/MariaDB English FULLTEXT stopwords that break BOOLEAN
 * queries when marked required with `+` (e.g. “away”, “the”).
 */
const FULLTEXT_STOPWORDS = new Set(
  [
    'a',
    'about',
    'an',
    'are',
    'as',
    'at',
    'be',
    'by',
    'com',
    'de',
    'en',
    'for',
    'from',
    'how',
    'i',
    'in',
    'is',
    'it',
    'la',
    'of',
    'on',
    'or',
    'that',
    'the',
    'this',
    'to',
    'was',
    'what',
    'when',
    'where',
    'who',
    'will',
    'with',
    'und',
    'the',
    'www',
    'away',
    'all',
    'also',
    'and',
    'any',
    'but',
    'can',
    'had',
    'has',
    'have',
    'her',
    'him',
    'his',
    'its',
    'may',
    'not',
    'our',
    'out',
    'own',
    'said',
    'she',
    'some',
    'than',
    'their',
    'them',
    'then',
    'there',
    'these',
    'they',
    'use',
    'were',
    'which',
    'you',
    'your',
  ].map((w) => w.toLowerCase())
)

function escapeFulltextToken(token: string): string {
  return token.replace(/[+\-><()~*"@]+/g, ' ').trim()
}

/**
 * Build a BOOLEAN MODE query — prefix match per significant word.
 * Drops stopwords / tiny tokens so titles like “25-26 Marseille away shorts1”
 * still match (hyphenated numbers + “away” no longer wipe the result set).
 */
export function fulltextBooleanSearchTerm(searchTerm: string): string | null {
  const rawTokens = searchTerm.trim().split(/\s+/).filter(Boolean)
  const tokens: string[] = []
  for (const raw of rawTokens) {
    const cleaned = escapeFulltextToken(raw)
    if (!cleaned) continue
    for (const part of cleaned.split(/\s+/)) {
      const t = part.trim()
      if (t.length < 3) continue
      if (FULLTEXT_STOPWORDS.has(t.toLowerCase())) continue
      tokens.push(t)
    }
  }
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
 * Always OR’s name/SKU substring match so pasted titles work even when
 * FULLTEXT drops stopwords or short tokens.
 * Server callers should pass useFulltext from productsFulltextSearchAvailable().
 */
export function buildProductSearchFilter(
  searchTerm: string,
  options: ProductSearchFilterOptions = {}
): { sql: string; params: unknown[] } {
  const trimmed = searchTerm.trim()
  if (!trimmed) return { sql: '1 = 1', params: [] }

  const like = `%${trimmed}%`
  // Exact-ish paste of title or SKU — always available as a safety net.
  const substringParts = ['p.name LIKE ?', 'p.sku LIKE ?']
  const substringParams: unknown[] = [like, like]

  if (options.useFulltext) {
    const booleanTerm = fulltextBooleanSearchTerm(trimmed)
    if (booleanTerm) {
      const parts = [
        'MATCH(p.name, p.sku, p.brand, p.short_description, p.category) AGAINST (? IN BOOLEAN MODE)',
        ...substringParts,
      ]
      const params: unknown[] = [booleanTerm, ...substringParams]
      if (options.includeBrandJoin) {
        parts.push('b.name LIKE ?')
        params.push(like)
      }
      if (options.includeCategoryJoin) {
        parts.push('c.name LIKE ?')
        params.push(like)
      }
      parts.push('p.tags LIKE ?')
      params.push(like)
      return { sql: `(${parts.join(' OR ')})`, params }
    }
  }

  // Legacy LIKE fallback — keep narrow (no full description) to avoid heavy scans.
  const searchParts = [
    'p.name LIKE ?',
    'p.sku LIKE ?',
    'p.brand LIKE ?',
    'p.short_description LIKE ?',
    'p.category LIKE ?',
    'p.tags LIKE ?',
  ]
  const params: unknown[] = [like, like, like, like, like, like]
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
