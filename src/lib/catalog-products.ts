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
  brand?: string
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
  const search = searchParams.get('search')?.trim() || undefined
  const modeRaw = searchParams.get('mode')?.trim()
  const mode: CatalogMode | undefined =
    modeRaw === 'new' || modeRaw === 'all' ? modeRaw : undefined

  return { page, limit, category, subcategory, brand, search, mode }
}

function toMysqlDatetime(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

export type CatalogSqlFilters = {
  whereSql: string
  params: unknown[]
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
    params.push(...categoryIds, ...categoryIds)

    if (!query.strictCategoryIdOnly && query.legacyCategoryNames?.length) {
      const legacyNames = query.legacyCategoryNames.filter(Boolean)
      if (legacyNames.length) {
        const namePlaceholders = legacyNames.map(() => '?').join(', ')
        where.push(
          `(${idClause} OR (p.category_id IS NULL AND p.category IN (${namePlaceholders})))`
        )
        params.push(...legacyNames)
      } else {
        where.push(idClause)
      }
    } else {
      where.push(idClause)
    }
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

  return { ...base, status }
}

export type AdminProductFilterOptions = {
  status?: AdminProductStatusFilter
  search?: string
  category?: string
  brand?: string
  includeBrandJoin?: boolean
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

  if (options.category && options.category !== 'All') {
    where.push('(p.category = ? OR c.name = ?)')
    params.push(options.category, options.category)
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
  if (query.status && query.status !== 'all') {
    const params = new URLSearchParams(url.split('?')[1] ?? '')
    params.set('status', query.status)
    return `${basePath}?${params.toString()}`
  }
  return url
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
  if (query.search) params.set('search', query.search)
  if (query.mode) params.set('mode', query.mode)
  return `${basePath}?${params.toString()}`
}
