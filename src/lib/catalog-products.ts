import type { CatalogMode } from '@/lib/catalog'
import { getCatalogWeekRange } from '@/lib/catalog'
import type { Product } from '@/lib/types'

export const DEFAULT_CATALOG_PAGE_SIZE = 60
export const MAX_CATALOG_PAGE_SIZE = 120

export type CatalogProductsQuery = {
  page: number
  limit: number
  category?: string
  /** Narrow a parent category to one subcategory (e.g. SOCCER → SHIRTS). */
  subcategory?: string
  /** Resolved server-side — category ids for precise parent/child filtering. */
  categoryIds?: string[]
  /** Legacy product names when category_id is missing (not used for strict subcategory filters). */
  legacyCategoryNames?: string[]
  strictCategoryIdOnly?: boolean
  /** Qualified subcategory label (e.g. KIDS › SHOES) for text + id matching. */
  categoryStorageLabel?: string
  /** Homonymous subcategory ids under other parents — exclude from top-level roll-ups. */
  excludeCategoryIds?: string[]
  brand?: string
  tag?: string
  search?: string
  mode?: CatalogMode
}

export type CatalogProductsPage = {
  items: Product[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  dashboardStats?: ProductDashboardStats
}

export type ProductDashboardStats = {
  total: number
  active: number
  draft: number
  inactive: number
  trash: number
  importDrafts: number
}

export function isCatalogProductsPage(value: unknown): value is CatalogProductsPage {
  if (!value || typeof value !== 'object') return false
  const page = value as CatalogProductsPage
  return Array.isArray(page.items) && typeof page.total === 'number'
}

export function parseCatalogProductsQuery(
  searchParams: URLSearchParams
): CatalogProductsQuery | null {
  const pageRaw = searchParams.get('page')
  if (pageRaw == null || pageRaw === '') return null

  const page = Math.max(1, parseInt(pageRaw, 10) || 1)
  const limitRaw = parseInt(searchParams.get('limit') || String(DEFAULT_CATALOG_PAGE_SIZE), 10)
  const limit = Math.min(
    MAX_CATALOG_PAGE_SIZE,
    Math.max(1, Number.isFinite(limitRaw) ? limitRaw : DEFAULT_CATALOG_PAGE_SIZE)
  )

  const category = searchParams.get('category')?.trim() || undefined
  const subcategory = searchParams.get('subcategory')?.trim() || undefined
  const brand = searchParams.get('brand')?.trim() || undefined
  const tag = searchParams.get('tag')?.trim() || undefined
  const search = searchParams.get('search')?.trim() || undefined
  const modeRaw = searchParams.get('mode')?.trim()
  const mode: CatalogMode | undefined =
    modeRaw === 'new' || modeRaw === 'all' ? modeRaw : undefined

  return { page, limit, category, subcategory, brand, tag, search, mode }
}

function toMysqlDatetime(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

export type CatalogSqlFilters = {
  whereSql: string
  params: unknown[]
}

/** Match legacy `products.category` text, including compound values (e.g. "SHOES / BAGS"). */
export function buildLegacyCategoryTextMatch(names: string[]): { sql: string; params: unknown[] } {
  const parts: string[] = []
  const params: unknown[] = []
  for (const name of names) {
    parts.push(
      '(p.category = ? OR p.category LIKE ? OR p.category LIKE ? OR p.category LIKE ?)'
    )
    params.push(name, `${name} / %`, `% / ${name}`, `% / ${name} / %`)
  }
  return { sql: `(${parts.join(' OR ')})`, params }
}

/** Match `products.category` compound text using qualified labels (not bare SHOES). */
export function buildQualifiedCategoryTextMatch(labels: string[]): {
  sql: string
  params: unknown[]
} {
  const parts: string[] = []
  const params: unknown[] = []
  for (const raw of labels) {
    const label = raw.trim()
    if (!label) continue
    parts.push(
      '(p.category = ? OR p.category LIKE ? OR p.category LIKE ? OR p.category LIKE ?)'
    )
    params.push(label, `${label} / %`, `% / ${label}`, `% / ${label} / %`)
  }
  if (!parts.length) return { sql: '1 = 0', params: [] }
  return { sql: `(${parts.join(' OR ')})`, params }
}

/** Legacy `products.category` text applies only when FK is unset (avoids KIDS › SHOES leaking into SHOES). */
export const PRODUCT_CATEGORY_ID_UNSET_SQL =
  '(p.category_id IS NULL OR TRIM(p.category_id) = \'\')'

export function combineCategoryIdAndLegacyTextMatch(
  idClause: string,
  idParams: unknown[],
  textMatch: { sql: string; params: unknown[] }
): { sql: string; params: unknown[] } {
  if (textMatch.sql === '1 = 0') {
    return { sql: idClause, params: idParams }
  }
  return {
    sql: `(${idClause} OR (${PRODUCT_CATEGORY_ID_UNSET_SQL} AND ${textMatch.sql}))`,
    params: [...idParams, ...textMatch.params],
  }
}

export type CatalogFilterOptions = {
  /** Include brands.name in search / brand filter (when brands table is joined). */
  includeBrandJoin?: boolean
}

/** Shared WHERE for paginated shop catalog queries. */
export function buildActiveCatalogFilters(
  query: CatalogProductsQuery,
  options: CatalogFilterOptions = {}
): CatalogSqlFilters {
  const where: string[] = ["p.status = 'active'"]
  const params: unknown[] = []
  const includeBrand = options.includeBrandJoin === true

  if (query.mode === 'new') {
    const { start, end } = getCatalogWeekRange()
    where.push('p.created_at >= ? AND p.created_at < ?')
    params.push(toMysqlDatetime(start), toMysqlDatetime(end))
  }

  const categoryIds = query.categoryIds?.filter(Boolean)

  if (categoryIds?.length) {
    const idPlaceholders = categoryIds.map(() => '?').join(', ')
    const idClause = `(p.category_id IN (${idPlaceholders}) OR c.id IN (${idPlaceholders}))`

    if (query.strictCategoryIdOnly) {
      const labels = [
        query.categoryStorageLabel?.trim(),
        ...(query.legacyCategoryNames ?? []),
      ].filter(Boolean) as string[]
      const textMatch = buildQualifiedCategoryTextMatch(labels)
      const combined = combineCategoryIdAndLegacyTextMatch(
        idClause,
        [...categoryIds, ...categoryIds],
        textMatch
      )
      where.push(combined.sql)
      params.push(...combined.params)
    } else if (query.legacyCategoryNames?.length) {
      const legacyNames = query.legacyCategoryNames.filter(Boolean)
      if (legacyNames.length) {
        const legacy = buildQualifiedCategoryTextMatch(legacyNames)
        const combined = combineCategoryIdAndLegacyTextMatch(
          idClause,
          [...categoryIds, ...categoryIds],
          legacy
        )
        where.push(combined.sql)
        params.push(...combined.params)
      } else {
        where.push(idClause)
        params.push(...categoryIds, ...categoryIds)
      }
    } else {
      where.push(idClause)
      params.push(...categoryIds, ...categoryIds)
    }
  }

  const excludeCategoryIds = query.excludeCategoryIds?.filter(Boolean)
  if (excludeCategoryIds?.length) {
    const excludePlaceholders = excludeCategoryIds.map(() => '?').join(', ')
    where.push(
      `(${PRODUCT_CATEGORY_ID_UNSET_SQL} OR p.category_id NOT IN (${excludePlaceholders}))`
    )
    params.push(...excludeCategoryIds)
  }

  if (query.brand && query.brand !== 'All') {
    if (includeBrand) {
      where.push('(p.brand = ? OR b.name = ?)')
      params.push(query.brand, query.brand)
    } else {
      where.push('p.brand = ?')
      params.push(query.brand)
    }
  }

  const tag = query.tag?.trim()
  if (tag) {
    where.push(
      `(JSON_CONTAINS(COALESCE(p.tags, '[]'), JSON_QUOTE(?)) OR p.tags LIKE ?)`
    )
    params.push(tag, `%"${tag.replace(/"/g, '\\"')}"%`)
  }

  const searchTerm = query.search?.trim()
  if (searchTerm) {
    const like = `%${searchTerm}%`
    const searchParts = [
      'p.name LIKE ?',
      'p.sku LIKE ?',
      'p.brand LIKE ?',
      'p.description LIKE ?',
      'p.short_description LIKE ?',
      'p.category LIKE ?',
      'c.name LIKE ?',
      'p.tags LIKE ?',
    ]
    const searchParams = [like, like, like, like, like, like, like, like]
    if (includeBrand) {
      searchParts.push('b.name LIKE ?')
      searchParams.push(like)
    }
    where.push(`(${searchParts.join(' OR ')})`)
    params.push(...searchParams)
  }

  return {
    whereSql: `WHERE ${where.join(' AND ')}`,
    params,
  }
}

export type AdminProductStatusFilter = 'all' | 'active' | 'draft' | 'inactive' | 'trash'

export type AdminProductsQuery = CatalogProductsQuery & {
  status?: AdminProductStatusFilter
  /** Admin category filter — unique category row id (required for subcategories). */
  categoryId?: string
}

/** Admin product list — requires `page` (and usually `scope=admin`). */
export function parseAdminProductsQuery(
  searchParams: URLSearchParams
): AdminProductsQuery | null {
  const base = parseCatalogProductsQuery(searchParams)
  if (!base) return null

  const statusRaw = searchParams.get('status')?.trim().toLowerCase()
  const status: AdminProductStatusFilter | undefined =
    statusRaw === 'active' ||
    statusRaw === 'draft' ||
    statusRaw === 'inactive' ||
    statusRaw === 'trash' ||
    statusRaw === 'all'
      ? statusRaw
      : undefined

  const categoryId = searchParams.get('categoryId')?.trim() || undefined

  return { ...base, status, categoryId }
}

export type AdminProductFilterOptions = {
  status?: AdminProductStatusFilter
  search?: string
  /** @deprecated Use categoryIds — bare names collide (KIDS › SHOES vs SHOES). */
  category?: string
  brand?: string
  includeBrandJoin?: boolean
  categoryIds?: string[]
  strictCategoryIdOnly?: boolean
  legacyCategoryNames?: string[]
  /** Qualified subcategory label for text + id matching. */
  categoryStorageLabel?: string
  excludeCategoryIds?: string[]
}

/** WHERE clause for admin product tables (status, search, category, brand). */
export function buildAdminProductFilters(
  statusOrOptions?: AdminProductStatusFilter | AdminProductFilterOptions,
  search?: string
): CatalogSqlFilters {
  const options: AdminProductFilterOptions =
    typeof statusOrOptions === 'object' && statusOrOptions !== null
      ? statusOrOptions
      : { status: statusOrOptions, search }

  const where: string[] = []
  const params: unknown[] = []
  const includeBrand = options.includeBrandJoin === true

  if (options.status && options.status !== 'all') {
    where.push('p.status = ?')
    params.push(options.status)
  }

  const categoryIds = options.categoryIds?.filter(Boolean)

  if (categoryIds?.length) {
    const idPlaceholders = categoryIds.map(() => '?').join(', ')
    const idClause = `p.category_id IN (${idPlaceholders})`

    if (options.strictCategoryIdOnly) {
      const labels = [
        options.categoryStorageLabel?.trim(),
        ...(options.legacyCategoryNames ?? []),
      ].filter(Boolean) as string[]
      const textMatch = buildQualifiedCategoryTextMatch(labels)
      const combined = combineCategoryIdAndLegacyTextMatch(idClause, categoryIds, textMatch)
      where.push(combined.sql)
      params.push(...combined.params)
    } else if (options.legacyCategoryNames?.length) {
      const legacy = buildQualifiedCategoryTextMatch(options.legacyCategoryNames.filter(Boolean))
      const combined = combineCategoryIdAndLegacyTextMatch(idClause, categoryIds, legacy)
      where.push(combined.sql)
      params.push(...combined.params)
    } else {
      where.push(idClause)
      params.push(...categoryIds)
    }
  } else if (categoryIds && categoryIds.length === 0) {
    where.push('1 = 0')
  } else if (options.category && options.category !== 'All') {
    where.push('(p.category = ? OR c.name = ?)')
    params.push(options.category, options.category)
  }

  const excludeCategoryIds = options.excludeCategoryIds?.filter(Boolean)
  if (excludeCategoryIds?.length) {
    const excludePlaceholders = excludeCategoryIds.map(() => '?').join(', ')
    where.push(
      `(${PRODUCT_CATEGORY_ID_UNSET_SQL} OR p.category_id NOT IN (${excludePlaceholders}))`
    )
    params.push(...excludeCategoryIds)
  }

  if (options.brand && options.brand !== 'All') {
    if (includeBrand) {
      where.push('(p.brand = ? OR b.name = ?)')
      params.push(options.brand, options.brand)
    } else {
      where.push('p.brand = ?')
      params.push(options.brand)
    }
  }

  const searchTerm = options.search?.trim()
  if (searchTerm) {
    const like = `%${searchTerm}%`
    const searchParts = [
      'p.name LIKE ?',
      'p.sku LIKE ?',
      'p.brand LIKE ?',
      'p.description LIKE ?',
      'p.short_description LIKE ?',
      'p.category LIKE ?',
      'c.name LIKE ?',
      'p.tags LIKE ?',
    ]
    const searchParams = [like, like, like, like, like, like, like, like]
    if (includeBrand) {
      searchParts.push('b.name LIKE ?')
      searchParams.push(like)
    }
    where.push(`(${searchParts.join(' OR ')})`)
    params.push(...searchParams)
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  }
}

export function buildAdminProductsUrl(
  basePath: string,
  query: AdminProductsQuery
): string {
  const url = buildCatalogProductsUrl(basePath, query)
  const params = new URLSearchParams(url.split('?')[1] ?? '')
  if (query.status && query.status !== 'all') {
    params.set('status', query.status)
  }
  if (query.categoryId) {
    params.delete('category')
    params.set('categoryId', query.categoryId)
  }
  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

export function buildCatalogProductsUrl(
  basePath: string,
  query: CatalogProductsQuery
): string {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('limit', String(query.limit))
  if (query.category && query.category !== 'All') params.set('category', query.category)
  if (query.subcategory && query.subcategory !== 'All') {
    params.set('subcategory', query.subcategory)
  }
  if (query.brand && query.brand !== 'All') params.set('brand', query.brand)
  if (query.tag) params.set('tag', query.tag)
  if (query.search) params.set('search', query.search)
  if (query.mode) params.set('mode', query.mode)
  return `${basePath}?${params.toString()}`
}
