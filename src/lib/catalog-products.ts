import type { CatalogMode } from '@/lib/catalog'
import { getCatalogWeekRange } from '@/lib/catalog'
import type { Product } from '@/lib/types'
import { buildProductSearchFilter } from '@/lib/product-search-sql'

/** Products per pagination page (UI and total page count). */
export const CATALOG_PAGE_SIZE = 24
/** Initial fetch size — matches page size so one request fills the grid. */
export const CATALOG_BATCH_SIZE = CATALOG_PAGE_SIZE
/** @deprecated Use CATALOG_PAGE_SIZE */
export const DEFAULT_CATALOG_PAGE_SIZE = CATALOG_PAGE_SIZE
export const MAX_CATALOG_PAGE_SIZE = 60
export const MAX_ADMIN_PRODUCTS_PAGE_SIZE = 500

export function catalogPageBaseOffset(page: number): number {
  return (page - 1) * CATALOG_PAGE_SIZE
}

/** SQL offset for a batch within a catalog page (0 = first batch, 1 = second). */
export function catalogBatchOffset(page: number, batchIndex: number): number {
  return catalogPageBaseOffset(page) + batchIndex * CATALOG_BATCH_SIZE
}

export function itemsOnCatalogPage(total: number, page: number): number {
  const base = catalogPageBaseOffset(page)
  return Math.min(CATALOG_PAGE_SIZE, Math.max(0, total - base))
}

export type CatalogProductsQuery = {
  page: number
  limit: number
  /** Row offset within the full result set (defaults to page-based offset). */
  offset?: number
  category?: string
  /** Narrow a parent category to one subcategory (e.g. SOCCER → SHIRTS). */
  subcategory?: string
  /** Third-level pill (e.g. CLOTHES → SOCKS → WOMEN). */
  nested?: string
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
  /** Resolved server-side from brand name — enables indexed brand_id filter. */
  brandId?: string
  tag?: string
  search?: string
  mode?: CatalogMode
  /** Homepage-style random order (unfiltered global catalog only). */
  shuffle?: boolean
  /** Skip COUNT(*) — client already has total from page 1 (faster page 2+). */
  skipTotal?: boolean
}

export type CatalogProductsPage = {
  items: Product[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  /** True when `total` was not recomputed (pagination fast path). */
  skipTotal?: boolean
  dashboardStats?: ProductDashboardStats
}

export type ProductDashboardStats = {
  total: number
  active: number
  draft: number
  inactive: number
  trash: number
  importDrafts: number
  /** Products marked out of stock on the platform pricelist. */
  outOfStock: number
}

export function isCatalogProductsPage(value: unknown): value is CatalogProductsPage {
  if (!value || typeof value !== 'object') return false
  const page = value as CatalogProductsPage
  return Array.isArray(page.items) && typeof page.total === 'number'
}

export function parseCatalogProductsQuery(
  searchParams: URLSearchParams,
  options?: { maxPageSize?: number }
): CatalogProductsQuery | null {
  const pageRaw = searchParams.get('page')
  if (pageRaw == null || pageRaw === '') return null

  const page = Math.max(1, parseInt(pageRaw, 10) || 1)
  const limitRaw = parseInt(searchParams.get('limit') || String(DEFAULT_CATALOG_PAGE_SIZE), 10)
  const maxPageSize = options?.maxPageSize ?? MAX_CATALOG_PAGE_SIZE
  const limit = Math.min(
    maxPageSize,
    Math.max(1, Number.isFinite(limitRaw) ? limitRaw : DEFAULT_CATALOG_PAGE_SIZE)
  )

  const offsetRaw = searchParams.get('offset')
  const offset =
    offsetRaw != null && offsetRaw !== ''
      ? Math.max(0, parseInt(offsetRaw, 10) || 0)
      : undefined

  const category = searchParams.get('category')?.trim() || undefined
  const subcategory = searchParams.get('subcategory')?.trim() || undefined
  const nested = searchParams.get('nested')?.trim() || undefined
  const brand = searchParams.get('brand')?.trim() || undefined
  const tag = searchParams.get('tag')?.trim() || undefined
  const search = searchParams.get('search')?.trim() || undefined
  const modeRaw = searchParams.get('mode')?.trim()
  const mode: CatalogMode | undefined =
    modeRaw === 'new' || modeRaw === 'all' ? modeRaw : undefined
  const shuffleRaw = searchParams.get('shuffle')?.trim().toLowerCase()
  const shuffle = shuffleRaw === '1' || shuffleRaw === 'true'
  const skipTotal = searchParams.get('skipTotal') === '1'

  return { page, limit, offset, category, subcategory, nested, brand, tag, search, mode, shuffle, skipTotal }
}

function toMysqlDatetime(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

export type CatalogSqlFilters = {
  whereSql: string
  params: unknown[]
  extraJoinSql?: string
}

/** Match legacy `products.category` text applies only when FK is unset (avoids KIDS › SHOES leaking into SHOES). */
export const PRODUCT_CATEGORY_ID_UNSET_SQL =
  '(p.category_id IS NULL OR TRIM(p.category_id) = \'\')'

/** Legacy brand text applies only when brand_id FK is unset. */
export const PRODUCT_BRAND_ID_UNSET_SQL =
  '(p.brand_id IS NULL OR TRIM(p.brand_id) = \'\')'

/** Match products whose sole or collab brand includes `brandName` (e.g. NIKE in "LOUIS VUITTON X NIKE"). */
export function buildProductBrandSegmentFilter(
  brandName: string,
  options: { includeBrandJoin?: boolean } = {}
): { sql: string; params: unknown[] } {
  const lower = brandName.trim().toLowerCase()
  const clauses = [
    'LOWER(TRIM(p.brand)) = ?',
    'LOWER(TRIM(p.brand)) LIKE ?',
    'LOWER(TRIM(p.brand)) LIKE ?',
    'LOWER(TRIM(p.brand)) LIKE ?',
  ]
  const params: unknown[] = [lower, `${lower} x %`, `% x ${lower}`, `% x ${lower} x %`]
  if (options.includeBrandJoin) {
    clauses.push('LOWER(TRIM(b.name)) = ?')
    params.push(lower)
  }
  return { sql: `(${clauses.join(' OR ')})`, params }
}

/** Prefer indexed brand_id when known; fall back to legacy text for collabs / missing FK. */
export function buildProductBrandFilter(
  brandName: string,
  options: { brandId?: string; includeBrandJoin?: boolean } = {}
): { sql: string; params: unknown[] } {
  const textFilter = buildProductBrandSegmentFilter(brandName, {
    includeBrandJoin: options.includeBrandJoin,
  })
  if (!options.brandId) return textFilter
  return {
    sql: `(p.brand_id = ? OR (${PRODUCT_BRAND_ID_UNSET_SQL} AND ${textFilter.sql}))`,
    params: [options.brandId, ...textFilter.params],
  }
}

function productBrandMatchInnerSql(): string {
  return `p.brand_id = b.id
    OR LOWER(TRIM(p.brand)) = LOWER(TRIM(b.name))
    OR LOWER(TRIM(p.brand)) LIKE CONCAT(LOWER(TRIM(b.name)), ' X %')
    OR LOWER(TRIM(p.brand)) LIKE CONCAT('% X ', LOWER(TRIM(b.name)))
    OR LOWER(TRIM(p.brand)) LIKE CONCAT('% X ', LOWER(TRIM(b.name)), ' X %')`
}

/** EXISTS-friendly match: product row includes brand `b.name` as sole or collab segment. */
export function buildProductIncludesBrandSql(): string {
  return `(${productBrandMatchInnerSql()})`
}

/** JOIN `products p` to `brands b` when the row includes that brand (sole or collab). */
export function buildProductBrandJoinOnSql(): string {
  return `b.active = 1 AND (${productBrandMatchInnerSql()})`
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
  /** Pricelist bulk-add includes inactive catalog products (shop stays active-only). */
  includeInactiveForPricelist?: boolean
  /** Use FULLTEXT index for search (when available). */
  useFulltextSearch?: boolean
  /** Resolved brands.id for indexed brand filter. */
  brandId?: string
  /** Shop grid listing — indexed category_id only (legacy rows need backfill). */
  categoryListingIdOnly?: boolean
}

/** Shared WHERE for paginated shop catalog queries. */
export function buildActiveCatalogFilters(
  query: CatalogProductsQuery,
  options: CatalogFilterOptions = {}
): CatalogSqlFilters {
  const where: string[] = [
    options.includeInactiveForPricelist
      ? "p.status IN ('active', 'inactive')"
      : "p.status = 'active'",
  ]
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
    const idClause = `p.category_id IN (${idPlaceholders})`

    if (options.categoryListingIdOnly) {
      where.push(idClause)
      params.push(...categoryIds)
    } else if (query.strictCategoryIdOnly) {
      const labels = [
        query.categoryStorageLabel?.trim(),
        ...(query.legacyCategoryNames ?? []),
      ].filter(Boolean) as string[]
      const textMatch = buildQualifiedCategoryTextMatch(labels)
      const combined = combineCategoryIdAndLegacyTextMatch(idClause, categoryIds, textMatch)
      where.push(combined.sql)
      params.push(...combined.params)
    } else if (query.legacyCategoryNames?.length) {
      const legacyNames = query.legacyCategoryNames.filter(Boolean)
      if (legacyNames.length) {
        const legacy = buildQualifiedCategoryTextMatch(legacyNames)
        const combined = combineCategoryIdAndLegacyTextMatch(idClause, categoryIds, legacy)
        where.push(combined.sql)
        params.push(...combined.params)
      } else {
        where.push(idClause)
        params.push(...categoryIds)
      }
    } else {
      where.push(idClause)
      params.push(...categoryIds)
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
    const brandFilter = buildProductBrandFilter(query.brand, {
      brandId: options.brandId ?? query.brandId,
      includeBrandJoin: includeBrand,
    })
    where.push(brandFilter.sql)
    params.push(...brandFilter.params)
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
    const searchFilter = buildProductSearchFilter(searchTerm, {
      includeBrandJoin: includeBrand,
      includeCategoryJoin: Boolean(categoryIds?.length),
      useFulltext: options.useFulltextSearch,
    })
    where.push(searchFilter.sql)
    params.push(...searchFilter.params)
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
  /** Show products with supplier purchase price filled on a pricelist page. */
  filledPricesOnly?: boolean
  /** Show products marked out of stock on a pricelist page. */
  outOfStockOnly?: boolean
  /** Pricelist page slug or owner id (defaults to platform when filledPricesOnly / outOfStockOnly). */
  pricelistOwner?: string
}

/** Admin product list — requires `page` (and usually `scope=admin`). */
export function parseAdminProductsQuery(
  searchParams: URLSearchParams
): AdminProductsQuery | null {
  const base = parseCatalogProductsQuery(searchParams, {
    maxPageSize: MAX_ADMIN_PRODUCTS_PAGE_SIZE,
  })
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
  const filledPricesOnly = searchParams.get('filledPrices') === 'true'
  const outOfStockOnly = searchParams.get('outOfStock') === 'true'
  const pricelistOwner = searchParams.get('pricelistOwner')?.trim() || undefined

  return {
    ...base,
    status,
    categoryId,
    filledPricesOnly: filledPricesOnly || undefined,
    outOfStockOnly: outOfStockOnly || undefined,
    pricelistOwner,
  }
}

export type AdminProductFilterOptions = {
  status?: AdminProductStatusFilter
  search?: string
  /** @deprecated Use categoryIds — bare names collide (KIDS › SHOES vs SHOES). */
  category?: string
  brand?: string
  /** Resolved server-side from brand name — enables indexed brand_id filter. */
  brandId?: string
  includeBrandJoin?: boolean
  categoryIds?: string[]
  strictCategoryIdOnly?: boolean
  legacyCategoryNames?: string[]
  /** Qualified subcategory label for text + id matching. */
  categoryStorageLabel?: string
  excludeCategoryIds?: string[]
  useFulltextSearch?: boolean
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
    const brandFilter = buildProductBrandFilter(options.brand, {
      brandId: options.brandId,
      includeBrandJoin: includeBrand,
    })
    where.push(brandFilter.sql)
    params.push(...brandFilter.params)
  }

  const searchTerm = options.search?.trim()
  if (searchTerm) {
    const searchFilter = buildProductSearchFilter(searchTerm, {
      includeBrandJoin: includeBrand,
      includeCategoryJoin: Boolean(categoryIds?.length || options.category),
      useFulltext: options.useFulltextSearch,
    })
    where.push(searchFilter.sql)
    params.push(...searchFilter.params)
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  }
}

export type BulkArchiveProductFilterOptions = {
  categoryIds?: string[]
  legacyCategoryNames?: string[]
  excludeCategoryIds?: string[]
  strictCategoryIdOnly?: boolean
  brands?: string[]
  /** Yupoo album datePublished — products with source_album_date strictly before this date. */
  albumDateBefore: string
  includeBrandJoin?: boolean
}

/** Products to archive: active/draft only, Yupoo album date before cutoff, optional category + brand filters. */
export function buildBulkArchiveProductFilters(
  options: BulkArchiveProductFilterOptions
): CatalogSqlFilters {
  const where: string[] = ["p.status IN ('active', 'draft')", 'p.source_album_date IS NOT NULL']
  const params: unknown[] = [`${options.albumDateBefore.trim()} 00:00:00`]
  where.push('p.source_album_date < ?')

  const includeBrand = options.includeBrandJoin === true
  const categoryIds = options.categoryIds?.filter(Boolean)

  if (categoryIds?.length) {
    const idPlaceholders = categoryIds.map(() => '?').join(', ')
    const idClause = `p.category_id IN (${idPlaceholders})`

    if (options.legacyCategoryNames?.length) {
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
  }

  const excludeCategoryIds = options.excludeCategoryIds?.filter(Boolean)
  if (excludeCategoryIds?.length) {
    const excludePlaceholders = excludeCategoryIds.map(() => '?').join(', ')
    where.push(
      `(${PRODUCT_CATEGORY_ID_UNSET_SQL} OR p.category_id NOT IN (${excludePlaceholders}))`
    )
    params.push(...excludeCategoryIds)
  }

  const brands = options.brands?.map((b) => b.trim()).filter(Boolean) ?? []
  if (brands.length === 1) {
    const brandFilter = buildProductBrandSegmentFilter(brands[0]!, {
      includeBrandJoin: includeBrand,
    })
    where.push(brandFilter.sql)
    params.push(...brandFilter.params)
  } else if (brands.length > 1) {
    const parts = brands.map((brand) =>
      buildProductBrandSegmentFilter(brand, { includeBrandJoin: includeBrand })
    )
    where.push(`(${parts.map((part) => part.sql).join(' OR ')})`)
    for (const part of parts) params.push(...part.params)
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
  if (query.filledPricesOnly) {
    params.set('filledPrices', 'true')
  }
  if (query.outOfStockOnly) {
    params.set('outOfStock', 'true')
  }
  if (query.pricelistOwner) {
    params.set('pricelistOwner', query.pricelistOwner)
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
  if (query.offset != null && query.offset > 0) {
    params.set('offset', String(query.offset))
  }
  if (query.category && query.category !== 'All') params.set('category', query.category)
  if (query.subcategory && query.subcategory !== 'All') {
    params.set('subcategory', query.subcategory)
  }
  if (query.nested && query.nested !== 'All') {
    params.set('nested', query.nested)
  }
  if (query.brand && query.brand !== 'All') params.set('brand', query.brand)
  if (query.tag) params.set('tag', query.tag)
  if (query.search) params.set('search', query.search)
  if (query.mode) params.set('mode', query.mode)
  if (query.shuffle) params.set('shuffle', '1')
  if (query.skipTotal) params.set('skipTotal', '1')
  return `${basePath}?${params.toString()}`
}

/** True when the catalog should use weighted-random homepage ordering. */
export function isCatalogShuffleEligible(query: CatalogProductsQuery): boolean {
  return (
    query.shuffle === true &&
    query.mode !== 'new' &&
    !query.category &&
    !query.subcategory &&
    !query.nested &&
    !query.brand &&
    !query.tag &&
    !query.search?.trim()
  )
}

/** Prefer priced products (~60%) while keeping unpriced items in the mix. */
export function catalogShuffleOrderSql(): string {
  return `(
    CASE
      WHEN COALESCE(p.price, 0) > 0 THEN RAND() * 0.55
      ELSE 0.55 + RAND() * 0.45
    END
  ) ASC, p.id ASC`
}
