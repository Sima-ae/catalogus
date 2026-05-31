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
  /** Resolved server-side — parent + descendants or single subcategory. */
  categoryNames?: string[]
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

  const categoryNames =
    query.categoryNames?.filter(Boolean) ??
    (query.category && query.category !== 'All' ? [query.category] : undefined)

  if (categoryNames?.length) {
    const placeholders = categoryNames.map(() => '?').join(', ')
    where.push(`(p.category IN (${placeholders}) OR c.name IN (${placeholders}))`)
    params.push(...categoryNames, ...categoryNames)
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
