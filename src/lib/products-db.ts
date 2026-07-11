import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'
import { slugifyCategory } from '@/lib/category-slug'
import {
  buildActiveCatalogFilters,
  buildAdminProductFilters,
  buildBulkArchiveProductFilters,
  buildProductBrandSegmentFilter,
  catalogPageBaseOffset,
  CATALOG_PAGE_SIZE,
  isCatalogShuffleEligible,
  PRODUCT_CATEGORY_ID_UNSET_SQL,
  type AdminProductFilterOptions,
  type AdminProductStatusFilter,
  type CatalogProductsPage,
  type CatalogProductsQuery,
  type ProductDashboardStats,
} from '@/lib/catalog-products'
import { loadActiveCategories } from '@/lib/categories-persistence'
import { buildShopCategoryMenu, buildShopTopCategoryNames } from '@/lib/shop-category-menu'
import {
  buildShopCategoryNavTree,
  type ShopCategoryNavNode,
} from '@/lib/shop-category-nav'
import { formatCategoryDisplayName } from '@/lib/category-picker'
import { syncTagTranslationsForTags } from '@/lib/tag-translations-db'
import {
  getDirectChildCategories,
  getDirectChildCategoriesUnderPath,
  isQualifiedSiblingCategory,
  resolveShopCategoryFilter,
  type ShopCategoryFilterResult,
} from '@/lib/shop-category-tree'
import { applyStorefrontSoldOutFromPlatformPricelist } from '@/lib/pricelist-db'
import { markPricelistOutOfStockForProducts } from '@/lib/pricelist-catalog-status-sync'
import {
  buildAdminProductFilledPricelistPriceSql,
  buildAdminProductOutOfStockPricelistSql,
} from '@/lib/pricelist-list-query'
import { resolvePricelistOwnerId } from '@/lib/pricelist-pages-db'
import { PLATFORM_PRICELIST_OWNER_ID } from '@/lib/pricelist-constants'
import {
  serializeAdminListProductRow,
  serializeCatalogProductRow,
  serializeProductRow,
  parseProductJsonField,
  resolveProductBrandDisplay,
  type SerializeProductRowOptions,
} from '@/lib/product-serialize'
import { joinBrandNames, parseBrandCompound } from '@/lib/product-taxonomy'
import {
  brandsTableExists,
  productsHaveBrandColumn,
  productsHaveBrandIdColumn,
  resolveProductBrandInput,
  UnknownBrandError,
} from '@/lib/brands-db'
import { getBrandSkuPrefixes, getAllBrandNames } from '@/lib/brand-sku-prefixes'
import { polishProductTextForStorage, polishProductTitleForStorage } from '@/lib/product-brand-text'
import { titleNeedsCjkCleanup } from '@/lib/yupoo/product-title'
import {
  catalogPositionJoin,
  catalogPositionsExistForScope,
  fetchHomepageShufflePageProductIds,
  HOMEPAGE_SHUFFLE_POOL_SIZE,
  HOMEPAGE_SHUFFLE_SCOPE,
} from '@/lib/catalog-positions-db'
import { catalogSortScope } from '@/lib/catalog-sort-scope'
import { getCachedValue, invalidateCachedNamespace, peekCachedValue } from '@/lib/server-ttl-cache'
import { productsFulltextSearchAvailable } from '@/lib/product-search-db'
import { resolveBrandByName } from '@/lib/brands-db'
import {
  DuplicateSkuError,
  MissingSkuError,
  normalizeProductSku,
  randomNumericSkuCandidate,
  requireProductSku,
} from '@/lib/product-sku'
import { normalizeProductImagesForStorage, normalizeProductImageListForStorage, normalizeProductImageUrl, normalizeStoredProductImages } from '@/lib/product-image-url'
import type { ProductOptions } from '@/lib/product-options'

export { UnknownBrandError } from '@/lib/brands-db'

export type ProductInput = {
  name: string
  description: string
  short_description?: string
  price: number
  original_price?: number | null
  purchase_price?: number | null
  shipping_cost?: number | null
  image_url: string
  gallery_images?: string[] | null
  category: string
  /** When set, links to this categories row (avoids ambiguous name matches). */
  category_id?: string | null
  brand?: string | null
  tags?: string[] | null
  features?: string[] | null
  requirements?: string[] | null
  compatibility?: string | null
  author: string
  author_icon: string
  author_id?: string | null
  sku?: string | null
  download_url?: string | null
  demo_url?: string | null
  documentation_url?: string | null
  support_url?: string | null
  version?: string | null
  license_type?: string | null
  rating?: number | null
  review_count?: number | null
  download_count?: number | null
  status?: string
  featured?: boolean
  sold_out?: boolean
  pre_order?: boolean
  available_sizes?: string | null
  available_colors?: string | null
  product_options?: ProductOptions | null
  source_url?: string | null
  source_album_id?: string | null
  source_album_date?: string | null
}

export class UnknownCategoryError extends Error {
  constructor(name: string) {
    super(`Category "${name}" does not exist. Add it under Admin → Categories first.`)
    this.name = 'UnknownCategoryError'
  }
}

export { DuplicateSkuError, MissingSkuError } from '@/lib/product-sku'

const SKU_DUPLICATE_ORDER = `ORDER BY CASE WHEN status = 'trash' THEN 1 ELSE 0 END, created_at ASC, id ASC`

/** Find another product with the same SKU (case-insensitive). */
export async function findProductBySku(
  sku: string | null | undefined,
  excludeProductId?: string | null
): Promise<{ id: string; status: string } | null> {
  const normalized = normalizeProductSku(sku)
  if (!normalized) return null

  const exclude = excludeProductId?.trim()
  const excludeSql = exclude ? ' AND id <> ?' : ''
  const excludeParams = exclude ? [exclude] : []

  const rows = await queryDb<{ id: string; status: string }[]>(
    `SELECT id, status FROM products
     WHERE sku IS NOT NULL AND LOWER(TRIM(sku)) = LOWER(?)
     ${excludeSql}
     ${SKU_DUPLICATE_ORDER}
     LIMIT 1`,
    [normalized, ...excludeParams]
  )
  return rows[0] ?? null
}

/** Random numeric SKU (e.g. "3792") that is not already used by another product. */
export async function generateUniqueNumericSku(): Promise<string> {
  for (let digits = 4; digits <= 6; digits++) {
    for (let attempt = 0; attempt < 80; attempt++) {
      const sku = randomNumericSkuCandidate(digits)
      if (!(await findProductBySku(sku))) return sku
    }
  }
  throw new Error('Could not generate a unique SKU; try again.')
}

/**
 * Find a product imported from a Yupoo album by SKU (`albumId` or `hint-albumId`).
 * SKU-based — does not use source_album_id or brand.
 */
export async function findProductByAlbumSku(
  albumId: string,
  excludeProductId?: string | null
): Promise<{ id: string; status: string } | null> {
  const id = String(albumId ?? '').trim()
  if (!id) return null

  const byExact = await findProductBySku(id, excludeProductId)
  if (byExact) return byExact

  const exclude = excludeProductId?.trim()
  const excludeSql = exclude ? ' AND id <> ?' : ''
  const excludeParams = exclude ? [exclude] : []

  const rows = await queryDb<{ id: string; status: string }[]>(
    `SELECT id, status FROM products
     WHERE sku IS NOT NULL AND TRIM(sku) <> ''
       AND (LOWER(TRIM(sku)) = LOWER(?) OR LOWER(TRIM(sku)) LIKE LOWER(?))
     ${excludeSql}
     ${SKU_DUPLICATE_ORDER}
     LIMIT 1`,
    [id, `%-${id}`, ...excludeParams]
  )
  return rows[0] ?? null
}

async function assertSkuIsUnique(sku: string, excludeProductId?: string) {
  const normalized = normalizeProductSku(sku)
  if (!normalized) throw new MissingSkuError()

  const existing = await findProductBySku(normalized, excludeProductId)
  if (existing) {
    throw new DuplicateSkuError(normalized)
  }
}

type ProductSchemaFlags = {
  categoryId: boolean
  authorId: boolean
  compatibility: boolean
  support_url: boolean
  available_sizes: boolean
  available_colors: boolean
  product_options: boolean
  source_url: boolean
  source_album_id: boolean
  source_album_date: boolean
}

const SCHEMA_CACHE_KEY = '__catalogusProductSchema'
const SELECT_SQL_CACHE_KEY = '__catalogusProductSelectSql'
const ADMIN_SELECT_CACHE_KEY = '__catalogusAdminSelectSql'
const CATALOG_FROM_CACHE_KEY = '__catalogusCatalogFromSql'
const CATALOG_SELECT_CACHE_KEY = '__catalogusCatalogSelectSql'
const CATALOG_LISTING_SELECT_CACHE_KEY = '__catalogusCatalogListingSelectSql'

const PRODUCT_DASHBOARD_STATS_CACHE_NS = 'product-dashboard-stats'
const PRODUCT_DASHBOARD_STATS_CACHE_TTL_MS = 30_000

function invalidateProductDashboardStatsCache() {
  invalidateCachedNamespace(PRODUCT_DASHBOARD_STATS_CACHE_NS)
}

type GlobalSchema = typeof globalThis & {
  [SCHEMA_CACHE_KEY]?: ProductSchemaFlags
  [SELECT_SQL_CACHE_KEY]?: string
  [ADMIN_SELECT_CACHE_KEY]?: string
  [CATALOG_FROM_CACHE_KEY]?: string
  [CATALOG_SELECT_CACHE_KEY]?: string
  [CATALOG_LISTING_SELECT_CACHE_KEY]?: string
}

async function getProductSchemaFlags(): Promise<ProductSchemaFlags> {
  const g = globalThis as GlobalSchema
  if (g[SCHEMA_CACHE_KEY]) return g[SCHEMA_CACHE_KEY]

  try {
    const rows = await queryDb<{ COLUMN_NAME: string }[]>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
         AND COLUMN_NAME IN (
           'category_id', 'author_id', 'compatibility', 'support_url',
           'available_sizes', 'available_colors', 'product_options', 'source_url', 'source_album_id',
           'source_album_date'
         )`
    )
    const names = new Set(rows.map((r) => r.COLUMN_NAME))
    g[SCHEMA_CACHE_KEY] = {
      categoryId: names.has('category_id'),
      authorId: names.has('author_id'),
      compatibility: names.has('compatibility'),
      support_url: names.has('support_url'),
      available_sizes: names.has('available_sizes'),
      available_colors: names.has('available_colors'),
      product_options: names.has('product_options'),
      source_url: names.has('source_url'),
      source_album_id: names.has('source_album_id'),
      source_album_date: names.has('source_album_date'),
    }
  } catch {
    g[SCHEMA_CACHE_KEY] = {
      categoryId: false,
      authorId: false,
      compatibility: false,
      support_url: false,
      available_sizes: false,
      available_colors: false,
      product_options: false,
      source_url: false,
      source_album_id: false,
      source_album_date: false,
    }
  }
  return g[SCHEMA_CACHE_KEY]
}

async function productsContentColumns() {
  const s = await getProductSchemaFlags()
  return { compatibility: s.compatibility, support_url: s.support_url }
}

async function productsHaveCategoryIdColumn() {
  return (await getProductSchemaFlags()).categoryId
}

function jsonCol(value: unknown) {
  if (value == null) return null
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

async function buildProductJoinFragments() {
  const hasCategoryId = await productsHaveCategoryIdColumn()
  const hasBrandsTable = await brandsTableExists()
  const hasBrandId = hasBrandsTable && (await productsHaveBrandIdColumn())
  const categoryJoin = hasCategoryId
    ? `LEFT JOIN categories c ON c.active = 1 AND (
         (p.category_id IS NOT NULL AND c.id = p.category_id)
         OR (p.category_id IS NULL AND c.name = p.category)
       )`
    : `LEFT JOIN categories c ON c.active = 1 AND c.name = p.category`
  const brandJoin = hasBrandsTable
    ? hasBrandId
      ? `LEFT JOIN brands b ON b.active = 1 AND (
           (p.brand_id IS NOT NULL AND b.id = p.brand_id)
           OR (p.brand_id IS NULL AND b.name = p.brand)
         )`
      : `LEFT JOIN brands b ON b.active = 1 AND b.name = p.brand`
    : ''
  const brandSelect = hasBrandsTable
    ? `,
      b.id AS resolved_brand_id,
      b.name AS resolved_brand_name,
      b.slug AS resolved_brand_slug`
    : ''
  return { categoryJoin, brandJoin, brandSelect }
}

/** FROM + JOINs for catalog list/count queries (no column projection). */
async function catalogListingFromSql() {
  const g = globalThis as GlobalSchema
  if (g[CATALOG_FROM_CACHE_KEY]) return g[CATALOG_FROM_CACHE_KEY]

  const { categoryJoin, brandJoin } = await buildProductJoinFragments()
  g[CATALOG_FROM_CACHE_KEY] = `
    FROM products p
    ${categoryJoin}
    LEFT JOIN pricelist_pages pp ON pp.id = p.supplier_pricelist_id
    ${brandJoin}
  `
  return g[CATALOG_FROM_CACHE_KEY]
}

type CatalogListingJoinOptions = {
  needsCategoryJoin: boolean
  needsBrandJoin: boolean
}

async function catalogListingFromSqlForQuery(options: CatalogListingJoinOptions): Promise<string> {
  const parts = ['FROM products p']
  if (options.needsCategoryJoin || options.needsBrandJoin) {
    const { categoryJoin, brandJoin } = await buildProductJoinFragments()
    if (options.needsCategoryJoin) parts.push(categoryJoin)
    if (options.needsBrandJoin && brandJoin) parts.push(brandJoin)
  }
  return parts.join('\n')
}

function catalogListingNeedsCategoryJoin(
  _categoryFilter: ReturnType<typeof resolveShopCategoryFilter> | null | undefined,
  _query: Pick<CatalogProductsQuery, 'search'>
): boolean {
  // Category filters use indexed p.category_id + legacy p.category text — no categories join.
  return false
}

function catalogListingNeedsBrandJoin(
  _query: Pick<CatalogProductsQuery, 'brand' | 'search'>,
  _hasBrandsTable: boolean
): boolean {
  // Brand filters use indexed p.brand_id + legacy p.brand text — no brands join.
  return false
}

/** Lightweight SELECT for shop grid — no category/brand JOINs (uses p.category / p.brand). */
async function catalogListingSelectSql(): Promise<string> {
  const g = globalThis as GlobalSchema
  if (g[CATALOG_LISTING_SELECT_CACHE_KEY]) return g[CATALOG_LISTING_SELECT_CACHE_KEY]

  g[CATALOG_LISTING_SELECT_CACHE_KEY] = `
    SELECT
      p.id,
      p.name,
      p.short_description,
      p.price,
      p.original_price,
      p.image_url,
      p.category,
      p.category_id,
      p.brand,
      p.brand_id,
      p.product_options,
      p.sold_out,
      p.pre_order,
      p.featured,
      p.source_url,
      p.author_id,
      p.sku
    FROM products p
  `
  return g[CATALOG_LISTING_SELECT_CACHE_KEY]
}

/** Lightweight SELECT for shop grid rows — skips description, gallery, tags, etc. */
async function catalogProductSelectSql() {
  const g = globalThis as GlobalSchema
  if (g[CATALOG_SELECT_CACHE_KEY]) return g[CATALOG_SELECT_CACHE_KEY]

  const { categoryJoin, brandJoin, brandSelect } = await buildProductJoinFragments()

  g[CATALOG_SELECT_CACHE_KEY] = `
    SELECT
      p.id,
      p.name,
      p.short_description,
      p.price,
      p.original_price,
      p.image_url,
      p.category,
      p.category_id,
      p.brand,
      p.brand_id,
      p.product_options,
      p.sold_out,
      p.pre_order,
      p.featured,
      p.source_url,
      p.author_id,
      p.sku,
      c.id AS resolved_category_id,
      c.name AS resolved_category_name,
      c.slug AS resolved_category_slug${brandSelect}
    FROM products p
    ${categoryJoin}
    ${brandJoin}
  `
  return g[CATALOG_SELECT_CACHE_KEY]
}

async function productSelectSql() {
  const g = globalThis as GlobalSchema
  if (g[SELECT_SQL_CACHE_KEY]) return g[SELECT_SQL_CACHE_KEY]

  const [fromClause, { brandSelect }] = await Promise.all([
    catalogListingFromSql(),
    buildProductJoinFragments(),
  ])

  g[SELECT_SQL_CACHE_KEY] = `
    SELECT
      p.*,
      c.id AS resolved_category_id,
      c.name AS resolved_category_name,
      c.slug AS resolved_category_slug,
      pp.label AS supplier_pricelist_label,
      pp.slug AS supplier_pricelist_slug${brandSelect}
    ${fromClause}
  `
  return g[SELECT_SQL_CACHE_KEY]
}

/** Slim SELECT for admin product table — skips description, gallery, features, etc. */
async function adminProductSelectSql() {
  const g = globalThis as GlobalSchema
  if (g[ADMIN_SELECT_CACHE_KEY]) return g[ADMIN_SELECT_CACHE_KEY]

  const [fromClause, { brandSelect }] = await Promise.all([
    catalogListingFromSql(),
    buildProductJoinFragments(),
  ])

  g[ADMIN_SELECT_CACHE_KEY] = `
    SELECT
      p.id,
      p.name,
      p.sku,
      p.price,
      p.original_price,
      p.purchase_price,
      p.shipping_cost,
      p.image_url,
      p.category,
      p.category_id,
      p.brand,
      p.brand_id,
      p.product_options,
      p.tags,
      p.status,
      p.source_url,
      p.created_at,
      p.updated_at,
      c.id AS resolved_category_id,
      c.name AS resolved_category_name,
      c.slug AS resolved_category_slug,
      pp.label AS supplier_pricelist_label,
      pp.slug AS supplier_pricelist_slug${brandSelect}
    ${fromClause}
  `
  return g[ADMIN_SELECT_CACHE_KEY]
}

async function adminListingFromSql(options: {
  needsCategoryJoin: boolean
  needsBrandJoin: boolean
  needsPricelistJoin: boolean
}): Promise<string> {
  const parts = ['FROM products p']
  if (options.needsCategoryJoin || options.needsBrandJoin) {
    const { categoryJoin, brandJoin } = await buildProductJoinFragments()
    if (options.needsCategoryJoin) parts.push(categoryJoin)
    if (options.needsBrandJoin && brandJoin) parts.push(brandJoin)
  }
  if (options.needsPricelistJoin) {
    parts.push('LEFT JOIN pricelist_pages pp ON pp.id = p.supplier_pricelist_id')
  }
  return parts.join('\n')
}

function adminListingNeedsCategoryJoin(
  options: {
    categoryId?: string
    category?: string
    search?: string
  },
  categoryFilterOpts: Awaited<ReturnType<typeof resolveAdminCategoryFilterOptions>>
): boolean {
  return Boolean(
    options.categoryId ||
      (options.category && options.category !== 'All') ||
      categoryFilterOpts.categoryIds?.length ||
      String(options.search ?? '').trim()
  )
}

async function resolveCatalogQueryBrandId(
  brandName: string | undefined
): Promise<string | undefined> {
  const trimmed = brandName?.trim()
  if (!trimmed || trimmed === 'All') return undefined
  const resolved = await resolveBrandByName(trimmed)
  return resolved?.id
}

/** One row per product — guards against any residual join fan-out. */
function dedupeProductRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>()
  const result: Record<string, unknown>[] = []
  for (const row of rows) {
    const id = String(row.id ?? '')
    if (!id || seen.has(id)) continue
    seen.add(id)
    result.push(row)
  }
  return result
}

async function serializeProductRows(
  rows: Record<string, unknown>[],
  options?: SerializeProductRowOptions & { catalog?: boolean; adminList?: boolean }
) {
  if (options?.catalog) {
    const brandSkuPrefixes =
      options.brandSkuPrefixes ?? (await getBrandSkuPrefixes())
    return dedupeProductRows(rows).map((row) =>
      serializeCatalogProductRow(row, { brandSkuPrefixes, ...options })
    )
  }

  if (options?.adminList) {
    const brandSkuPrefixes =
      options.brandSkuPrefixes ?? (await getBrandSkuPrefixes())
    return dedupeProductRows(rows).map((row) =>
      serializeAdminListProductRow(row, { brandSkuPrefixes, ...options })
    )
  }

  const brandSkuPrefixes =
    options?.brandSkuPrefixes ?? (await getBrandSkuPrefixes())
  const brandNames = options?.brandNames ?? (await getAllBrandNames())
  const cjkTitleCache = new Map<string, string>()

  const deduped = dedupeProductRows(rows)

  return Promise.all(
    deduped.map(async (row) => {
      let rowToSerialize = row
      const rawName = String(row.name ?? '').trim()
      if (rawName && titleNeedsCjkCleanup(rawName)) {
        let polished = cjkTitleCache.get(rawName)
        if (!polished) {
          const brand = resolveProductBrandDisplay(row)
          polished = await polishProductTitleForStorage(rawName, brandNames, brand)
          cjkTitleCache.set(rawName, polished)
        }
        rowToSerialize = { ...row, name: polished }
      }

      return serializeProductRow(rowToSerialize, {
        brandSkuPrefixes,
        brandNames,
        ...options,
      })
    })
  )
}

async function fetchProductRowsByIds(
  ids: string[],
  options?: { catalog?: boolean; adminList?: boolean }
): Promise<Record<string, unknown>[]> {
  if (!ids.length) return []
  const select = options?.catalog
    ? await catalogProductSelectSql()
    : options?.adminList
      ? await adminProductSelectSql()
      : await productSelectSql()
  const placeholders = ids.map(() => '?').join(', ')
  const rows = await queryDb<Record<string, unknown>[]>(
    `${select} WHERE p.id IN (${placeholders})`,
    ids
  )
  const byId = new Map(rows.map((row) => [String(row.id ?? ''), row]))
  return ids.map((id) => byId.get(id)).filter(Boolean) as Record<string, unknown>[]
}

/** Resolve category label to a row in the categories table (required for products). */
export async function resolveCategoryByName(
  categoryName: string,
  options?: { parentId?: string | null }
): Promise<{ id: string; name: string } | null> {
  const trimmed = categoryName.trim()
  if (!trimmed) return null

  if (options?.parentId !== undefined) {
    const rows = await queryDb<{ id: string; name: string }[]>(
      `SELECT id, name FROM categories
       WHERE active = 1 AND parent_id <=> ? AND (name = ? OR slug = ?)
       LIMIT 1`,
      [options.parentId, trimmed, slugifyCategory(trimmed)]
    )
    return rows[0] ?? null
  }

  const rows = await queryDb<{ id: string; name: string }[]>(
    `SELECT id, name FROM categories
     WHERE active = 1 AND (name = ? OR slug = ?)
     ORDER BY CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END, name ASC
     LIMIT 1`,
    [trimmed, slugifyCategory(trimmed)]
  )
  return rows[0] ?? null
}

export async function resolveCategoryById(
  categoryId: string
): Promise<{ id: string; name: string } | null> {
  const id = categoryId.trim()
  if (!id) return null
  const rows = await queryDb<{ id: string; name: string }[]>(
    `SELECT id, name FROM categories WHERE active = 1 AND id = ? LIMIT 1`,
    [id]
  )
  return rows[0] ?? null
}

async function resolveCategoryByQualifiedLabel(
  label: string
): Promise<{ id: string; name: string } | null> {
  const trimmed = label.trim()
  if (!trimmed) return null

  const pathMatch = trimmed.match(/^(.+?)\s*[›>]\s*(.+)$/)
  if (pathMatch) {
    const parentName = pathMatch[1]!.trim()
    const childName = pathMatch[2]!.trim()
    const parent = await resolveCategoryByName(parentName)
    if (!parent) return null
    return resolveCategoryByName(childName, { parentId: parent.id })
  }

  return resolveCategoryByName(trimmed)
}

/** Resolve category for bulk edit; supports compound labels (e.g. "SOCCER › SHOES / BAGS"). */
async function resolveBulkCategoryInput(categoryName: string): Promise<{ id: string; name: string }> {
  const trimmed = categoryName.trim()
  if (!trimmed) throw new UnknownCategoryError('')

  const firstSegment = trimmed.split('/').map((s) => s.trim()).find(Boolean)
  if (!firstSegment) throw new UnknownCategoryError(trimmed)

  const resolved = await resolveCategoryByQualifiedLabel(firstSegment)
  if (!resolved) throw new UnknownCategoryError(firstSegment)

  return { id: resolved.id, name: trimmed }
}

/** Resolve brand for bulk edit; supports collab labels (e.g. "Supreme X Nike"). */
async function resolveBulkBrandInput(
  brandName: string
): Promise<{ id?: string; name: string | null }> {
  const trimmed = brandName.trim()
  const segments = parseBrandCompound(trimmed)
  if (segments.length <= 1) {
    try {
      return await resolveProductBrandInput(trimmed)
    } catch (err) {
      if (err instanceof UnknownBrandError) {
        return { name: trimmed, id: undefined }
      }
      throw err
    }
  }

  const canonicalNames: string[] = []
  let firstId: string | undefined

  for (const segment of segments) {
    try {
      const resolved = await resolveProductBrandInput(segment)
      if (resolved.name && !canonicalNames.includes(resolved.name)) {
        canonicalNames.push(resolved.name)
      }
      if (!firstId && resolved.id) firstId = resolved.id
    } catch (err) {
      if (err instanceof UnknownBrandError) {
        if (!canonicalNames.includes(segment)) canonicalNames.push(segment)
      } else {
        throw err
      }
    }
  }

  return {
    name: canonicalNames.length ? joinBrandNames(new Set(canonicalNames), canonicalNames) : trimmed,
    id: firstId,
  }
}

async function resolveProductCategoryInput(
  categoryName: string,
  categoryId?: string | null
) {
  const trimmed = categoryName.trim()

  if (categoryId?.trim()) {
    const byId = await resolveCategoryById(categoryId)
    if (byId) {
      return { id: byId.id, name: trimmed || byId.name }
    }
  }

  if (!trimmed) throw new UnknownCategoryError('')

  if (trimmed.includes('/')) {
    return resolveBulkCategoryInput(trimmed)
  }

  const resolved = await resolveCategoryByQualifiedLabel(trimmed)
  if (!resolved) throw new UnknownCategoryError(trimmed)
  return { id: resolved.id, name: trimmed }
}

async function resolveBrandForStorage(brandName: string | null | undefined) {
  const trimmed = brandName?.trim()
  if (!trimmed) return { name: null as string | null, id: undefined as string | undefined }
  if (/\s+X\s+/i.test(trimmed)) {
    return resolveBulkBrandInput(trimmed)
  }
  return resolveProductBrandInput(trimmed)
}

export type ShopSubcategoryOption = {
  id: string
  name: string
  productCount: number
}

const SHOP_CATEGORY_MENU_CACHE_NS = 'shop-category-menu'
const SHOP_CATEGORY_MENU_TTL_MS = 1_800_000
const SHOP_CATEGORY_NAV_CACHE_NS = 'shop-category-nav'
const SHOP_SUBCATEGORY_CACHE_NS = 'shop-subcategories'
const SHOP_SUBCATEGORY_TTL_MS = 1_800_000
const PRODUCT_COUNT_BUCKETS_NS = 'product-count-buckets'
const PRODUCT_COUNT_BUCKETS_TTL_MS = 1_800_000
const SHOP_CATALOG_COUNT_CACHE_NS = 'shop-catalog-count'
const SHOP_CATALOG_COUNT_TTL_MS = 300_000
const SHOP_SHUFFLE_PAGE_CACHE_NS = 'shop-shuffle-page'
const SHOP_SHUFFLE_PAGE_TTL_MS = 120_000
const SHOP_CATALOG_PAGE_CACHE_NS = 'shop-catalog-page'
const SHOP_CATALOG_PAGE_TTL_MS = 120_000
const ACTIVE_PRODUCT_TOTAL_CACHE_NS = 'active-product-total'
const ACTIVE_PRODUCT_TOTAL_TTL_MS = 300_000
const SHUFFLE_CANDIDATE_POOL_SIZE = 800

async function loadActiveProductCountBuckets(options?: {
  brand?: string
  mode?: CatalogProductsQuery['mode']
}): Promise<Map<string, number>> {
  const cacheKey = `${String(options?.brand ?? '').trim().toLowerCase()}|${options?.mode ?? ''}`
  return getCachedValue(
    PRODUCT_COUNT_BUCKETS_NS,
    cacheKey,
    PRODUCT_COUNT_BUCKETS_TTL_MS,
    async () => {
      const brand = options?.brand?.trim()
      const brandFilter = brand && brand !== 'All' ? brand : undefined
      const hasBrandsTable = await brandsTableExists()
      const hasCategoryId = await productsHaveCategoryIdColumn()
      const buckets = new Map<string, number>()

      if (hasCategoryId) {
        if (brandFilter && hasBrandsTable) {
          const brandId = (await resolveBrandByName(brandFilter))?.id
          if (brandId) {
            const idRows = await queryDb<{ category_id: string; total: number }[]>(
              `SELECT p.category_id AS category_id, COUNT(*) AS total
               FROM products p
               WHERE p.status = 'active'
                 AND p.brand_id = ?
                 AND p.category_id IS NOT NULL
                 AND TRIM(CAST(p.category_id AS CHAR)) != ''
               GROUP BY p.category_id`,
              [brandId]
            )
            for (const row of idRows) {
              const id = String(row.category_id ?? '').trim()
              if (!id) continue
              buckets.set(`id:${id}`, Number(row.total ?? 0))
            }
            return buckets
          }
        }

        const idRows = await queryDb<{ category_id: string; total: number }[]>(
          `SELECT p.category_id AS category_id, COUNT(*) AS total
           FROM products p
           WHERE p.status = 'active'
             AND p.category_id IS NOT NULL
             AND TRIM(CAST(p.category_id AS CHAR)) != ''
           GROUP BY p.category_id`
        )
        for (const row of idRows) {
          const id = String(row.category_id ?? '').trim()
          if (!id) continue
          buckets.set(`id:${id}`, Number(row.total ?? 0))
        }

        const legacyRows = await queryDb<{ legacy_name: string; total: number }[]>(
          `SELECT LOWER(TRIM(COALESCE(p.category, ''))) AS legacy_name, COUNT(*) AS total
           FROM products p
           WHERE p.status = 'active'
             AND (${PRODUCT_CATEGORY_ID_UNSET_SQL})
             AND TRIM(COALESCE(p.category, '')) != ''
           GROUP BY legacy_name`
        )
        for (const row of legacyRows) {
          const legacy = String(row.legacy_name ?? '').trim()
          if (!legacy) continue
          buckets.set(`legacy:${legacy}`, Number(row.total ?? 0))
        }
        return buckets
      }

      const needsBrandJoinFallback = Boolean(brandFilter && hasBrandsTable)
      const fromClause = await catalogListingFromSqlForQuery({
        needsCategoryJoin: true,
        needsBrandJoin: needsBrandJoinFallback && hasBrandsTable,
      })
      const { whereSql, params } = buildActiveCatalogFilters(
        { page: 1, limit: 1, brand: brandFilter, mode: options?.mode },
        { includeBrandJoin: needsBrandJoinFallback && hasBrandsTable }
      )
      const rows = await queryDb<{ bucket: string; total: number }[]>(
        `SELECT
          CASE
            WHEN p.category_id IS NOT NULL AND TRIM(CAST(p.category_id AS CHAR)) != ''
            THEN CONCAT('id:', p.category_id)
            ELSE CONCAT('legacy:', LOWER(TRIM(COALESCE(c.name, p.category, ''))))
          END AS bucket,
          COUNT(*) AS total
        ${fromClause}
        ${whereSql}
        GROUP BY bucket`,
        params
      )
      for (const row of rows) {
        const key = String(row.bucket ?? '').trim()
        if (!key || key === 'legacy:') continue
        buckets.set(key, Number(row.total ?? 0))
      }
      return buckets
    }
  )
}

function sumCategoryFilterCounts(
  filter: ShopCategoryFilterResult,
  buckets: Map<string, number>
): number {
  let total = 0
  const seenLegacy = new Set<string>()

  for (const id of filter.categoryIds) {
    total += buckets.get(`id:${id}`) ?? 0
  }

  for (const legacy of filter.legacyNames) {
    const key = `legacy:${legacy.trim().toLowerCase()}`
    if (seenLegacy.has(key)) continue
    seenLegacy.add(key)
    total += buckets.get(key) ?? 0
  }

  return total
}

/** Pre-aggregated counts — avoids a heavy COUNT(*) on every catalog page request. */
async function resolveShopCatalogTotalFromBuckets(
  categories: Awaited<ReturnType<typeof loadActiveCategories>>,
  categoryFilter: ShopCategoryFilterResult | undefined,
  query: Pick<CatalogProductsQuery, 'category' | 'brand' | 'search' | 'tag' | 'mode'>
): Promise<number | null> {
  if (query.search?.trim()) return null
  if (query.tag?.trim()) return null
  if (query.mode === 'new') return null

  const brand = query.brand && query.brand !== 'All' ? query.brand : undefined
  const buckets = await loadActiveProductCountBuckets({ brand, mode: query.mode })

  if (categoryFilter?.categoryIds.length) {
    return sumCategoryFilterCounts(categoryFilter, buckets)
  }

  if (brand) {
    let total = 0
    buckets.forEach((count) => {
      total += count
    })
    return total
  }

  if (!query.category || query.category === 'All') {
    return getCachedActiveProductTotal()
  }

  return null
}

function productCountBucketsCacheKey(options?: {
  brand?: string
  mode?: CatalogProductsQuery['mode']
}): string {
  return `${String(options?.brand ?? '').trim().toLowerCase()}|${options?.mode ?? ''}`
}

function peekProductCountBuckets(options?: {
  brand?: string
  mode?: CatalogProductsQuery['mode']
}): Map<string, number> | undefined {
  return peekCachedValue<Map<string, number>>(
    PRODUCT_COUNT_BUCKETS_NS,
    productCountBucketsCacheKey(options)
  )
}

/** Instant total when count buckets are already warm — never runs SQL. */
function peekShopCatalogTotalFromBuckets(
  categories: Awaited<ReturnType<typeof loadActiveCategories>>,
  categoryFilter: ShopCategoryFilterResult | undefined,
  query: Pick<CatalogProductsQuery, 'category' | 'brand' | 'search' | 'tag' | 'mode'>
): number | null {
  if (query.search?.trim()) return null
  if (query.tag?.trim()) return null
  if (query.mode === 'new') return null

  const brand = query.brand && query.brand !== 'All' ? query.brand : undefined
  const buckets = peekProductCountBuckets({ brand, mode: query.mode })
  if (!buckets) return null

  if (categoryFilter?.categoryIds.length) {
    return sumCategoryFilterCounts(categoryFilter, buckets)
  }

  if (brand) {
    let total = 0
    buckets.forEach((count) => {
      total += count
    })
    return total
  }

  if (!query.category || query.category === 'All') {
    const cached = peekCachedValue<number>(ACTIVE_PRODUCT_TOTAL_CACHE_NS, 'active')
    return cached ?? null
  }

  return null
}

/** Count-only catalog endpoint — uses warm buckets, never blocks product rows. */
export async function getShopCatalogProductTotal(
  query: Pick<
    CatalogProductsQuery,
    'category' | 'subcategory' | 'nested' | 'brand' | 'search' | 'tag' | 'mode'
  >
): Promise<number> {
  const categories = await loadActiveCategories()
  const categoryFilter = resolveShopCategoryFilter(categories, {
    category: query.category,
    subcategory: query.subcategory,
    nested: query.nested,
  })
  if (query.category && query.category !== 'All' && !categoryFilter?.categoryIds.length) {
    return 0
  }
  const peek = peekShopCatalogTotalFromBuckets(categories, categoryFilter, query)
  if (peek != null) return peek
  const resolved = await resolveShopCatalogTotalFromBuckets(categories, categoryFilter, query)
  return resolved ?? 0
}

/** Pre-warm count buckets on shop boot so first category click is fast. */
export function warmShopCatalogCountCaches(): void {
  void loadActiveProductCountBuckets()
  void getCachedActiveProductTotal()
}

/** Top-level shop categories with at least one active product in scope. */
export async function listShopTopCategoriesWithProducts(): Promise<string[]> {
  return getCachedValue(
    SHOP_CATEGORY_MENU_CACHE_NS,
    'menu',
    SHOP_CATEGORY_MENU_TTL_MS,
    async () => {
      const [categories, buckets] = await Promise.all([
        loadActiveCategories(),
        loadActiveProductCountBuckets(),
      ])
      const candidates = buildShopTopCategoryNames(categories)
      const counts = candidates.map((name) => {
        const filter = resolveShopCategoryFilter(categories, { category: name })
        const count = filter?.categoryIds.length
          ? sumCategoryFilterCounts(filter, buckets)
          : 0
        return { name, count }
      })
      return ['All', ...counts.filter((row) => row.count > 0).map((row) => row.name)]
    }
  )
}

/** Sidebar hierarchy: top categories → subcategories → nested (no brands). */
export async function listShopCategoryNavTree(): Promise<ShopCategoryNavNode[]> {
  return getCachedValue(
    SHOP_CATEGORY_NAV_CACHE_NS,
    'tree',
    SHOP_CATEGORY_MENU_TTL_MS,
    async () => {
      const [categories, buckets] = await Promise.all([
        loadActiveCategories(),
        loadActiveProductCountBuckets(),
      ])
      const roots = buildShopTopCategoryNames(categories)
      const countFor = (filter: ShopCategoryFilterResult | undefined) =>
        filter?.categoryIds.length ? sumCategoryFilterCounts(filter, buckets) : 0
      return buildShopCategoryNavTree(categories, roots, countFor, (input) =>
        resolveShopCategoryFilter(categories, input)
      )
    }
  )
}

/** Direct subcategories under a parent — only rows with at least one active product. */
export async function listShopSubcategoriesWithProducts(
  parentCategoryName: string,
  brandName?: string
): Promise<ShopSubcategoryOption[]> {
  const cacheKey = `${parentCategoryName.trim().toLowerCase()}|${String(brandName ?? '').trim().toLowerCase()}`
  return getCachedValue(
    SHOP_SUBCATEGORY_CACHE_NS,
    cacheKey,
    SHOP_SUBCATEGORY_TTL_MS,
    () => loadShopSubcategoriesWithProducts(parentCategoryName, brandName)
  )
}

async function loadShopSubcategoriesWithProducts(
  parentCategoryName: string,
  brandName?: string
): Promise<ShopSubcategoryOption[]> {
  const categories = await loadActiveCategories()
  const children = getDirectChildCategories(categories, parentCategoryName)
  if (!children.length) return []

  const brand = brandName?.trim()
  const brandFilter = brand && brand !== 'All' ? brand : undefined
  const buckets = await loadActiveProductCountBuckets({ brand: brandFilter })

  const rows = children.map((child) => {
    const filter = resolveShopCategoryFilter(categories, {
      category: parentCategoryName,
      subcategory: child.name,
    })
    const productCount =
      filter?.categoryIds.length ? sumCategoryFilterCounts(filter, buckets) : 0
    return {
      id: String(child.id),
      name: String(child.name),
      productCount,
    }
  })

  return rows.filter((row) => row.productCount > 0)
}

/** Third-level pills under category + subcategory — only rows with products in subtree. */
export async function listShopNestedSubcategoriesWithProducts(
  topCategoryName: string,
  subcategoryName: string,
  brandName?: string
): Promise<ShopSubcategoryOption[]> {
  const cacheKey = `${topCategoryName.trim().toLowerCase()}|${subcategoryName.trim().toLowerCase()}|${String(brandName ?? '').trim().toLowerCase()}`
  return getCachedValue(
    SHOP_SUBCATEGORY_CACHE_NS,
    `nested:${cacheKey}`,
    SHOP_SUBCATEGORY_TTL_MS,
    () => loadShopNestedSubcategoriesWithProducts(topCategoryName, subcategoryName, brandName)
  )
}

async function loadShopNestedSubcategoriesWithProducts(
  topCategoryName: string,
  subcategoryName: string,
  brandName?: string
): Promise<ShopSubcategoryOption[]> {
  const categories = await loadActiveCategories()
  const children = getDirectChildCategoriesUnderPath(
    categories,
    topCategoryName,
    subcategoryName
  )
  if (!children.length) return []

  const brand = brandName?.trim()
  const brandFilter = brand && brand !== 'All' ? brand : undefined
  const buckets = await loadActiveProductCountBuckets({ brand: brandFilter })

  const rows = children.map((child) => {
    const filter = resolveShopCategoryFilter(categories, {
      category: topCategoryName,
      subcategory: subcategoryName,
      nested: child.name,
    })
    const productCount =
      filter?.categoryIds.length ? sumCategoryFilterCounts(filter, buckets) : 0
    return {
      id: String(child.id),
      name: String(child.name),
      productCount,
    }
  })

  return rows.filter((row) => row.productCount > 0)
}

async function fetchProductRow(
  id: string,
  options?: Pick<SerializeProductRowOptions, 'includePurchasePrice' | 'storageImages'>
) {
  const select = await productSelectSql()
  const rows = await queryDb<Record<string, unknown>[]>(
    `${select} WHERE p.id = ? LIMIT 1`,
    [id]
  )
  if (!rows[0]) return null
  const brandSkuPrefixes = await getBrandSkuPrefixes()
  return serializeProductRow(rows[0], {
    brandSkuPrefixes,
    includePurchasePrice: options?.includePurchasePrice,
    storageImages: options?.storageImages,
  })
}

export async function insertProduct(input: ProductInput) {
  const category = await resolveProductCategoryInput(input.category, input.category_id)
  const brand =
    (await brandsTableExists()) ? await resolveBrandForStorage(input.brand) : { name: null, id: undefined }
  const brandPrefixes = await getBrandSkuPrefixes()
  const brandNames = await getAllBrandNames()
  const sku = requireProductSku(input.sku, brandPrefixes)
  await assertSkuIsUnique(sku)

  const id = randomUUID()
  const schema = await getProductSchemaFlags()
  const hasCategoryId = schema.categoryId
  const hasBrandCol = await productsHaveBrandColumn()
  const hasBrandId = await productsHaveBrandIdColumn()
  const contentCols = await productsContentColumns()
  const polishedText = await polishProductTextForStorage({
    name: String(input.name ?? '').trim(),
    description: input.description,
    short_description: input.short_description,
    brand: brand.name,
    brandNames,
  })
  const productName = polishedText.name
  const { description, short_description } = {
    description: polishedText.description,
    short_description: polishedText.short_description || null,
  }
  const images = normalizeProductImagesForStorage(input)

  const insertMap: Record<string, unknown> = {
    id,
    name: productName,
    description,
    short_description,
    price: input.price,
    original_price: input.original_price ?? null,
    purchase_price: input.purchase_price ?? null,
    shipping_cost: input.shipping_cost ?? null,
    image_url: images.image_url,
    gallery_images: jsonCol(images.gallery_images),
    category: category.name,
    ...(hasCategoryId ? { category_id: category.id } : {}),
    ...(hasBrandCol && brand.name ? { brand: brand.name } : {}),
    ...(hasBrandId && brand.id ? { brand_id: brand.id } : {}),
    tags: jsonCol(input.tags),
    features: jsonCol(input.features),
    requirements: jsonCol(input.requirements),
    ...(contentCols.compatibility ? { compatibility: input.compatibility || null } : {}),
    author: input.author,
    author_icon: input.author_icon,
    ...(schema.authorId && input.author_id ? { author_id: input.author_id } : {}),
    sku,
    download_url: input.download_url || null,
    demo_url: input.demo_url || null,
    documentation_url: input.documentation_url || null,
    ...(contentCols.support_url ? { support_url: input.support_url || null } : {}),
    version: input.version || null,
    license_type: input.license_type || null,
    rating: input.rating ?? null,
    review_count: input.review_count ?? null,
    download_count: input.download_count ?? null,
    status: input.status || 'active',
    featured: input.featured ? 1 : 0,
    sold_out: input.sold_out ? 1 : 0,
    pre_order: input.pre_order ? 1 : 0,
    ...(schema.available_sizes && input.available_sizes !== undefined
      ? { available_sizes: input.available_sizes || null }
      : {}),
    ...(schema.available_colors && input.available_colors !== undefined
      ? { available_colors: input.available_colors || null }
      : {}),
    ...(schema.product_options && input.product_options !== undefined
      ? { product_options: jsonCol(input.product_options) }
      : {}),
    ...(schema.source_url && input.source_url !== undefined
      ? { source_url: input.source_url || null }
      : {}),
    ...(schema.source_album_id && input.source_album_id !== undefined
      ? { source_album_id: input.source_album_id || null }
      : {}),
    ...(schema.source_album_date && input.source_album_date !== undefined
      ? { source_album_date: input.source_album_date || null }
      : {}),
  }

  const columns = Object.keys(insertMap)
  const placeholders = columns.map(() => '?').join(', ')
  await queryDb(
    `INSERT INTO products (${columns.map((c) => `\`${c}\``).join(', ')}) VALUES (${placeholders})`,
    columns.map((c) => insertMap[c])
  )

  void syncTagTranslationsForTags(input.tags).catch((err) => {
    console.error('[tag-translations] sync after insert failed:', err)
  })

  invalidateProductDashboardStatsCache()
  return fetchProductRow(id, { includePurchasePrice: true, storageImages: true })
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  const fields: string[] = []
  const values: unknown[] = []

  let categoryId: string | undefined
  let categoryName: string | undefined
  let brandId: string | undefined
  let brandName: string | null | undefined

  if (input.category !== undefined || input.category_id !== undefined) {
    const resolved = await resolveProductCategoryInput(
      input.category ?? '',
      input.category_id
    )
    categoryName = resolved.name
    categoryId = resolved.id
  }

  if (input.brand !== undefined && (await brandsTableExists())) {
    const resolved = await resolveBrandForStorage(input.brand)
    brandName = resolved.name
    brandId = resolved.id
  }

  const schema = await getProductSchemaFlags()
  const contentCols = await productsContentColumns()
  const hasCategoryId = schema.categoryId
  const hasBrandCol = await productsHaveBrandColumn()
  const hasBrandId = await productsHaveBrandIdColumn()
  const brandPrefixes = await getBrandSkuPrefixes()
  const brandNames = await getAllBrandNames()

  const normalizedImages =
    input.image_url !== undefined && input.gallery_images !== undefined
      ? normalizeStoredProductImages(input.image_url, input.gallery_images)
      : null

  const map: Record<string, unknown> = {
    name: undefined as string | undefined,
    description: input.description,
    short_description: input.short_description,
    price: input.price,
    original_price: input.original_price,
    purchase_price: input.purchase_price,
    shipping_cost: input.shipping_cost,
    image_url:
      normalizedImages != null
        ? normalizedImages.image_url
        : input.image_url !== undefined
          ? normalizeProductImageUrl(input.image_url)
          : undefined,
    gallery_images:
      normalizedImages != null
        ? jsonCol(normalizedImages.gallery_images)
        : input.gallery_images !== undefined
          ? jsonCol(normalizeProductImageListForStorage(input.gallery_images))
          : undefined,
    category: categoryName,
    category_id: categoryId,
    brand: hasBrandCol ? brandName : undefined,
    brand_id: hasBrandId ? brandId : undefined,
    tags: input.tags !== undefined ? jsonCol(input.tags) : undefined,
    features: input.features !== undefined ? jsonCol(input.features) : undefined,
    requirements: input.requirements !== undefined ? jsonCol(input.requirements) : undefined,
    compatibility:
      contentCols.compatibility && input.compatibility !== undefined
        ? input.compatibility || null
        : undefined,
    author: input.author,
    author_icon: input.author_icon,
    author_id: schema.authorId && input.author_id !== undefined ? input.author_id : undefined,
    sku: input.sku !== undefined ? normalizeProductSku(input.sku, brandPrefixes) : undefined,
    download_url: input.download_url,
    demo_url: input.demo_url,
    documentation_url: input.documentation_url,
    support_url:
      contentCols.support_url && input.support_url !== undefined
        ? input.support_url || null
        : undefined,
    version: input.version,
    license_type: input.license_type,
    rating: input.rating,
    review_count: input.review_count,
    download_count: input.download_count,
    status: input.status,
    featured: input.featured != null ? (input.featured ? 1 : 0) : undefined,
    sold_out: input.sold_out != null ? (input.sold_out ? 1 : 0) : undefined,
    pre_order: input.pre_order != null ? (input.pre_order ? 1 : 0) : undefined,
    available_sizes:
      schema.available_sizes && input.available_sizes !== undefined
        ? input.available_sizes || null
        : undefined,
    available_colors:
      schema.available_colors && input.available_colors !== undefined
        ? input.available_colors || null
        : undefined,
    product_options:
      schema.product_options && input.product_options !== undefined
        ? jsonCol(input.product_options)
        : undefined,
    source_url:
      schema.source_url && input.source_url !== undefined ? input.source_url || null : undefined,
    source_album_id:
      schema.source_album_id && input.source_album_id !== undefined
        ? input.source_album_id || null
        : undefined,
    source_album_date:
      schema.source_album_date && input.source_album_date !== undefined
        ? input.source_album_date || null
        : undefined,
  }

  if (
    input.name !== undefined ||
    input.description !== undefined ||
    input.short_description !== undefined
  ) {
    const existing = await queryDb<
      { name: string; description: string | null; short_description: string | null; brand: string | null }[]
    >(`SELECT name, description, short_description, brand FROM products WHERE id = ? LIMIT 1`, [id])
    const row = existing[0]
    const brandForClean =
      brandName !== undefined ? brandName : row?.brand?.trim() || null

    const polished = await polishProductTextForStorage({
      name:
        input.name !== undefined
          ? String(input.name).trim()
          : String(row?.name ?? '').trim(),
      description:
        input.description !== undefined
          ? String(input.description)
          : String(row?.description ?? ''),
      short_description:
        input.short_description !== undefined
          ? input.short_description
          : row?.short_description,
      brand: brandForClean,
      brandNames,
    })

    if (input.name !== undefined) map.name = polished.name
    if (input.description !== undefined) map.description = polished.description
    if (input.short_description !== undefined) {
      map.short_description = polished.short_description || null
    }
  }

  if (!hasCategoryId) {
    delete map.category_id
  }
  if (!hasBrandId) {
    delete map.brand_id
  }

  for (const [key, val] of Object.entries(map)) {
    if (val !== undefined) {
      fields.push(`${key} = ?`)
      values.push(val)
    }
  }

  if (!fields.length) {
    return fetchProductRow(id, { includePurchasePrice: true, storageImages: true })
  }

  if (input.sku !== undefined) {
    const sku = requireProductSku(input.sku, brandPrefixes)
    await assertSkuIsUnique(sku, id)
    const skuIdx = fields.findIndex((f) => f.startsWith('sku = '))
    if (skuIdx !== -1) {
      values[skuIdx] = sku
    }
  }

  if (input.brand !== undefined && hasBrandCol) {
    const albumRows = await queryDb<{ source_album_id: string | null }[]>(
      `SELECT source_album_id FROM products WHERE id = ? LIMIT 1`,
      [id]
    )
    const albumId = albumRows[0]?.source_album_id?.trim()
    if (albumId) {
      await releaseSourceAlbumBrandSlot(albumId, brandName ?? null, id)
    }
  }

  values.push(id)
  const updateSql = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`

  try {
    await queryDb(updateSql, values)
  } catch (err: unknown) {
    if (
      isSourceAlbumBrandConstraintError(err) &&
      input.brand !== undefined &&
      hasBrandCol
    ) {
      const albumRows = await queryDb<{ source_album_id: string | null }[]>(
        `SELECT source_album_id FROM products WHERE id = ? LIMIT 1`,
        [id]
      )
      const albumId = albumRows[0]?.source_album_id?.trim()
      if (albumId && (await releaseSourceAlbumBrandSlot(albumId, brandName ?? null, id)) > 0) {
        await queryDb(updateSql, values)
      } else {
        throw err
      }
    } else if (isSkuUniqueConstraintError(err) && input.sku !== undefined) {
      const sku = requireProductSku(input.sku, brandPrefixes)
      const other = await findProductBySku(sku, id)
      if (other && other.status !== 'trash') {
        await queryDb(`UPDATE products SET status = 'trash' WHERE id = ?`, [other.id])
        await queryDb(updateSql, values)
      } else {
        throw err
      }
    } else {
      throw err
    }
  }

  if (input.tags !== undefined) {
    void syncTagTranslationsForTags(input.tags).catch((err) => {
      console.error('[tag-translations] sync after update failed:', err)
    })
  }

  syncPricelistAfterCatalogStatusChange([id], input.status)

  invalidateProductDashboardStatsCache()
  return fetchProductRow(id, { includePurchasePrice: true, storageImages: true })
}

function shouldSyncPricelistOutOfStock(status: string | undefined): boolean {
  return status === 'draft'
}

function syncPricelistAfterCatalogStatusChange(
  productIds: string[],
  status: string | undefined
): void {
  if (!shouldSyncPricelistOutOfStock(status) || !productIds.length) return
  void markPricelistOutOfStockForProducts(productIds).catch((err) => {
    console.error('[pricelist-catalog-status-sync] failed:', err)
  })
}

export async function listProducts() {
  const select = await productSelectSql()
  const rows = await queryDb<Record<string, unknown>[]>(
    `${select} ORDER BY p.created_at DESC`
  )
  return await serializeProductRows(rows)
}

/** Active products only — public shop catalog. */
export async function listActiveProducts() {
  const select = await productSelectSql()
  const rows = await queryDb<Record<string, unknown>[]>(
    `${select} WHERE p.status = 'active' ORDER BY p.created_at DESC`
  )
  return await serializeProductRows(rows)
}

/** Paginated active catalog — filters applied in SQL for fast first paint. */
export async function listActiveProductsPaginated(
  query: CatalogProductsQuery
): Promise<CatalogProductsPage> {
  if (isCatalogShuffleEligible(query)) {
    const cacheKey = `p${query.page}-l${query.limit}-o${query.offset ?? catalogPageBaseOffset(query.page)}`
    return getCachedValue(
      SHOP_SHUFFLE_PAGE_CACHE_NS,
      cacheKey,
      SHOP_SHUFFLE_PAGE_TTL_MS,
      () => loadActiveProductsPaginatedFromDb(query)
    )
  }
  const cacheKey = shopCatalogPageCacheKey(query)
  return getCachedValue(
    SHOP_CATALOG_PAGE_CACHE_NS,
    cacheKey,
    SHOP_CATALOG_PAGE_TTL_MS,
    () => loadActiveProductsPaginatedFromDb(query)
  )
}

function shopCatalogPageCacheKey(query: CatalogProductsQuery): string {
  return [
    query.page,
    query.limit,
    query.offset ?? '',
    query.category ?? '',
    query.subcategory ?? '',
    query.nested ?? '',
    query.brand ?? '',
    query.tag ?? '',
    query.search ?? '',
    query.mode ?? '',
    query.skipTotal ? '1' : '0',
  ].join('|')
}

function shopCatalogCountCacheKey(
  fromClause: string,
  joinSql: string,
  whereSql: string,
  idParams: unknown[]
): string {
  return `${fromClause}|${joinSql}|${whereSql}|${JSON.stringify(idParams)}`
}

async function getCachedActiveProductTotal(): Promise<number> {
  return getCachedValue(
    ACTIVE_PRODUCT_TOTAL_CACHE_NS,
    'active',
    ACTIVE_PRODUCT_TOTAL_TTL_MS,
    async () => {
      const rows = await queryDb<{ total: number }[]>(
        `SELECT COUNT(*) AS total FROM products p WHERE p.status = 'active'`
      )
      return Number(rows[0]?.total ?? 0)
    }
  )
}

async function countShopCatalogProducts(
  fromClause: string,
  joinSql: string,
  whereSql: string,
  idParams: unknown[],
  shuffle: boolean
): Promise<number> {
  if (shuffle) {
    return getCachedActiveProductTotal()
  }
  const cacheKey = shopCatalogCountCacheKey(fromClause, joinSql, whereSql, idParams)
  return getCachedValue(
    SHOP_CATALOG_COUNT_CACHE_NS,
    cacheKey,
    SHOP_CATALOG_COUNT_TTL_MS,
    async () => {
      const countRows = await queryDb<{ total: number }[]>(
        `SELECT COUNT(*) AS total ${fromClause} ${joinSql} ${whereSql}`,
        idParams
      )
      return Number(countRows[0]?.total ?? 0)
    }
  )
}

type ShuffleCandidate = { id: string; price: number }

function weightedShuffleCandidates(candidates: ShuffleCandidate[]): ShuffleCandidate[] {
  return [...candidates].sort((a, b) => {
    const scoreA = a.price > 0 ? Math.random() * 0.55 : 0.55 + Math.random() * 0.45
    const scoreB = b.price > 0 ? Math.random() * 0.55 : 0.55 + Math.random() * 0.45
    if (scoreA !== scoreB) return scoreA - scoreB
    return a.id.localeCompare(b.id)
  })
}

async function fetchShuffledActiveProductIds(
  fromClause: string,
  whereSql: string,
  params: unknown[],
  limit: number,
  offset: number
): Promise<string[]> {
  const poolRows = await queryDb<ShuffleCandidate[]>(
    `SELECT p.id, COALESCE(p.price, 0) AS price ${fromClause} ${whereSql}
     ORDER BY p.created_at DESC LIMIT ?`,
    [...params, SHUFFLE_CANDIDATE_POOL_SIZE]
  )
  const shuffled = weightedShuffleCandidates(poolRows)
  return shuffled.slice(offset, offset + limit).map((row) => row.id)
}

async function loadActiveProductsPaginatedFromDb(
  query: CatalogProductsQuery
): Promise<CatalogProductsPage> {
  const searchActive = Boolean(query.search?.trim())
  const [categories, hasBrandsTable, brandId, brandSkuPrefixes, listingSelect] =
    await Promise.all([
      loadActiveCategories(),
      brandsTableExists(),
      resolveCatalogQueryBrandId(query.brand),
      getBrandSkuPrefixes(),
      catalogListingSelectSql(),
    ])
  const useFulltext = searchActive ? await productsFulltextSearchAvailable() : false
  const categoryFilter = resolveShopCategoryFilter(categories, {
    category: query.category,
    subcategory: query.subcategory,
    nested: query.nested,
  })

  if (query.category && query.category !== 'All' && !categoryFilter?.categoryIds.length) {
    return {
      items: [],
      total: 0,
      page: query.page,
      pageSize: CATALOG_PAGE_SIZE,
      totalPages: 1,
    }
  }

  const needsCategoryJoin = catalogListingNeedsCategoryJoin(categoryFilter, query)
  const needsBrandJoin = catalogListingNeedsBrandJoin(query, hasBrandsTable)

  const useIndexedCategoryListing =
    Boolean(categoryFilter?.categoryIds?.length) && !searchActive && !query.tag?.trim()
  const useIndexedBrandListing = Boolean(brandId && query.brand && query.brand !== 'All')

  const { whereSql, params } = buildActiveCatalogFilters(
    {
      ...query,
      brandId,
      categoryIds: categoryFilter?.categoryIds,
      legacyCategoryNames: categoryFilter?.legacyNames,
      strictCategoryIdOnly: categoryFilter?.strictIdOnly,
      categoryStorageLabel: categoryFilter?.categoryStorageLabel,
      excludeCategoryIds: categoryFilter?.excludeCategoryIds,
    },
    {
      includeBrandJoin: needsBrandJoin,
      useFulltextSearch: useFulltext,
      brandId,
      categoryListingIdOnly: useIndexedCategoryListing,
      brandListingIdOnly: useIndexedBrandListing,
    }
  )
  const limit = query.limit
  const offset = query.offset ?? (query.page - 1) * CATALOG_PAGE_SIZE
  const sortScope = catalogSortScope(query)
  const shuffle = isCatalogShuffleEligible(query)

  let joinSql = ''
  let orderSql = 'p.created_at DESC'
  let scopeParam: string | null = null

  if (shuffle) {
    const usePrecomputedShuffle =
      (await catalogPositionsExistForScope(HOMEPAGE_SHUFFLE_SCOPE)) === true
    if (usePrecomputedShuffle) {
      const positionJoin = await catalogPositionJoin(HOMEPAGE_SHUFFLE_SCOPE)
      joinSql = positionJoin.joinSql
      orderSql = positionJoin.orderSql
      scopeParam = positionJoin.scopeParam
    }
  } else if (sortScope != null && (await catalogPositionsExistForScope(sortScope))) {
    const positionJoin = await catalogPositionJoin(sortScope)
    joinSql = positionJoin.joinSql
    orderSql = positionJoin.orderSql
    scopeParam = positionJoin.scopeParam
  }

  const idParams = scopeParam ? [scopeParam, ...params] : params

  async function fetchPageProductRows(): Promise<Record<string, unknown>[]> {
    if (shuffle) {
      const usePrecomputedShuffle =
        (await catalogPositionsExistForScope(HOMEPAGE_SHUFFLE_SCOPE)) === true
      if (usePrecomputedShuffle) {
        const ids = await fetchHomepageShufflePageProductIds(
          HOMEPAGE_SHUFFLE_SCOPE,
          HOMEPAGE_SHUFFLE_POOL_SIZE,
          limit,
          offset
        )
        if (!ids.length) return []
        return fetchProductRowsByIds(ids, { catalog: true })
      }
      const fromClause = await catalogListingFromSqlForQuery({
        needsCategoryJoin,
        needsBrandJoin,
      })
      const ids = await fetchShuffledActiveProductIds(fromClause, whereSql, idParams, limit, offset)
      if (!ids.length) return []
      return fetchProductRowsByIds(ids, { catalog: true })
    }

    return queryDb<Record<string, unknown>[]>(
      `${listingSelect} ${joinSql} ${whereSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`,
      [...idParams, limit, offset]
    )
  }

  const rows = await fetchPageProductRows()
  const items = serializeProductRowsSync(rows, brandSkuPrefixes)

  let total = 0
  let responseSkipTotal = true
  if (!shuffle) {
    const peekTotal = peekShopCatalogTotalFromBuckets(categories, categoryFilter, query)
    if (peekTotal != null) {
      total = peekTotal
      responseSkipTotal = false
    } else {
      void resolveShopCatalogTotalFromBuckets(categories, categoryFilter, query)
    }
  }

  const pageTotal = responseSkipTotal ? 0 : total

  return {
    items: items as unknown as CatalogProductsPage['items'],
    total: pageTotal,
    page: query.page,
    pageSize: CATALOG_PAGE_SIZE,
    totalPages: responseSkipTotal
      ? 1
      : Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE) || 1),
    skipTotal: responseSkipTotal || undefined,
  }
}

function serializeProductRowsSync(
  rows: Record<string, unknown>[],
  brandSkuPrefixes: string[]
): ReturnType<typeof serializeCatalogProductRow>[] {
  return dedupeProductRows(rows).map((row) =>
    serializeCatalogProductRow(row, { brandSkuPrefixes })
  )
}

/** Active + inactive product ids matching shop catalog filters (pricelist bulk add). */
export async function resolvePricelistCatalogListSql(
  query: Omit<CatalogProductsQuery, 'page' | 'limit'>
): Promise<{ fromClause: string; whereSql: string; params: unknown[] } | null> {
  const [fromClause, categories, hasBrandsTable] = await Promise.all([
    catalogListingFromSql(),
    loadActiveCategories(),
    brandsTableExists(),
  ])
  const categoryFilter = resolveShopCategoryFilter(categories, {
    category: query.category,
    subcategory: query.subcategory,
    nested: query.nested,
  })

  if (query.category && query.category !== 'All' && !categoryFilter?.categoryIds.length) {
    return null
  }

  const { whereSql, params } = buildActiveCatalogFilters(
    {
      ...query,
      page: 1,
      limit: 1,
      categoryIds: categoryFilter?.categoryIds,
      legacyCategoryNames: categoryFilter?.legacyNames,
      strictCategoryIdOnly: categoryFilter?.strictIdOnly,
      categoryStorageLabel: categoryFilter?.categoryStorageLabel,
      excludeCategoryIds: categoryFilter?.excludeCategoryIds,
    },
    { includeBrandJoin: hasBrandsTable, includeInactiveForPricelist: true }
  )

  return { fromClause, whereSql, params }
}

export async function countPricelistCatalogProductsForQuery(
  query: Omit<CatalogProductsQuery, 'page' | 'limit'>
): Promise<number> {
  const [fromClause, categories, hasBrandsTable] = await Promise.all([
    catalogListingFromSql(),
    loadActiveCategories(),
    brandsTableExists(),
  ])
  const categoryFilter = resolveShopCategoryFilter(categories, {
    category: query.category,
    subcategory: query.subcategory,
    nested: query.nested,
  })

  if (query.category && query.category !== 'All' && !categoryFilter?.categoryIds.length) {
    return 0
  }

  const { whereSql, params } = buildActiveCatalogFilters(
    {
      ...query,
      page: 1,
      limit: 1,
      categoryIds: categoryFilter?.categoryIds,
      legacyCategoryNames: categoryFilter?.legacyNames,
      strictCategoryIdOnly: categoryFilter?.strictIdOnly,
      categoryStorageLabel: categoryFilter?.categoryStorageLabel,
      excludeCategoryIds: categoryFilter?.excludeCategoryIds,
    },
    { includeBrandJoin: hasBrandsTable, includeInactiveForPricelist: true }
  )

  const rows = await queryDb<{ total: number }[]>(
    `SELECT COUNT(DISTINCT p.id) AS total ${fromClause} ${whereSql}`,
    params
  )
  return Number(rows[0]?.total ?? 0)
}

/** Active product ids matching shop catalog filters (optional chunk for bulk operations). */
export async function resolveActiveCatalogListSql(
  query: Omit<CatalogProductsQuery, 'page' | 'limit'>
): Promise<{ fromClause: string; whereSql: string; params: unknown[] } | null> {
  const [fromClause, categories, hasBrandsTable] = await Promise.all([
    catalogListingFromSql(),
    loadActiveCategories(),
    brandsTableExists(),
  ])
  const categoryFilter = resolveShopCategoryFilter(categories, {
    category: query.category,
    subcategory: query.subcategory,
    nested: query.nested,
  })

  if (query.category && query.category !== 'All' && !categoryFilter?.categoryIds.length) {
    return null
  }

  const { whereSql, params } = buildActiveCatalogFilters(
    {
      ...query,
      page: 1,
      limit: 1,
      categoryIds: categoryFilter?.categoryIds,
      legacyCategoryNames: categoryFilter?.legacyNames,
      strictCategoryIdOnly: categoryFilter?.strictIdOnly,
      categoryStorageLabel: categoryFilter?.categoryStorageLabel,
      excludeCategoryIds: categoryFilter?.excludeCategoryIds,
    },
    { includeBrandJoin: hasBrandsTable }
  )

  return { fromClause, whereSql, params }
}

export async function listActiveProductIdsForCatalogQuery(
  query: Omit<CatalogProductsQuery, 'page' | 'limit'>,
  options?: { limit?: number; offset?: number }
): Promise<string[]> {
  const listSql = await resolveActiveCatalogListSql(query)
  if (!listSql) return []

  const { fromClause, whereSql, params } = listSql

  const limitClause =
    options?.limit != null
      ? ` LIMIT ${Math.max(1, Math.min(1000, Math.floor(options.limit)))}${
          options.offset != null ? ` OFFSET ${Math.max(0, Math.floor(options.offset))}` : ''
        }`
      : ''

  const rows = await queryDb<{ id: string }[]>(
    `SELECT DISTINCT p.id ${fromClause} ${whereSql}${limitClause}`,
    params
  )
  return rows.map((r) => String(r.id))
}

export async function countActiveProductsForCatalogQuery(
  query: Omit<CatalogProductsQuery, 'page' | 'limit'>
): Promise<number> {
  const [categories, hasBrandsTable] = await Promise.all([
    loadActiveCategories(),
    brandsTableExists(),
  ])
  const categoryFilter = resolveShopCategoryFilter(categories, {
    category: query.category,
    subcategory: query.subcategory,
    nested: query.nested,
  })

  if (query.category && query.category !== 'All' && !categoryFilter?.categoryIds.length) {
    return 0
  }

  const needsCategoryJoin = catalogListingNeedsCategoryJoin(categoryFilter, query)
  const needsBrandJoin = catalogListingNeedsBrandJoin(query, hasBrandsTable)
  const fromClause = await catalogListingFromSqlForQuery({
    needsCategoryJoin,
    needsBrandJoin,
  })

  const { whereSql, params } = buildActiveCatalogFilters(
    {
      ...query,
      page: 1,
      limit: 1,
      categoryIds: categoryFilter?.categoryIds,
      legacyCategoryNames: categoryFilter?.legacyNames,
      strictCategoryIdOnly: categoryFilter?.strictIdOnly,
      categoryStorageLabel: categoryFilter?.categoryStorageLabel,
      excludeCategoryIds: categoryFilter?.excludeCategoryIds,
    },
    { includeBrandJoin: needsBrandJoin }
  )

  const countRows = await queryDb<{ total: number }[]>(
    `SELECT COUNT(*) AS total ${fromClause} ${whereSql}`,
    params
  )
  return Number(countRows[0]?.total ?? 0)
}

/** Paginated all products (admin dashboard snippets). */
export async function listProductsPaginated(
  page: number,
  limit: number
): Promise<CatalogProductsPage> {
  return listProductsPaginatedAdmin(page, limit)
}

/** Resolve admin category dropdown id → SQL filter (strict id for subcategories). */
async function resolveAdminCategoryFilterOptions(
  categoryId: string | undefined
): Promise<Partial<AdminProductFilterOptions>> {
  const id = categoryId?.trim()
  if (!id) return {}

  const categories = await loadActiveCategories()
  const cat = categories.find((row) => String(row.id) === id)
  if (!cat) return { categoryIds: [] }

  if (cat.parent_id) {
    const parent = categories.find((row) => row.id === cat.parent_id)
    return {
      categoryIds: [String(cat.id)],
      strictCategoryIdOnly: true,
      categoryStorageLabel: formatCategoryDisplayName(
        String(cat.name),
        parent?.name ? String(parent.name) : null
      ),
      legacyCategoryNames: [
        formatCategoryDisplayName(
          String(cat.name),
          parent?.name ? String(parent.name) : null
        ),
      ],
    }
  }

  const resolved = resolveShopCategoryFilter(
    categories.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      parent_id: row.parent_id ?? null,
    })),
    { category: String(cat.name) }
  )
  if (!resolved?.categoryIds.length) return { categoryIds: [] }

  return {
    categoryIds: resolved.categoryIds,
    strictCategoryIdOnly: resolved.strictIdOnly,
    legacyCategoryNames: resolved.legacyNames,
    excludeCategoryIds: resolved.excludeCategoryIds,
  }
}

/** Paginated admin catalog with optional status/search/category/brand filters in SQL. */
export async function listProductsPaginatedAdmin(
  page: number,
  limit: number,
  options: {
    status?: AdminProductStatusFilter
    search?: string
    category?: string
    categoryId?: string
    brand?: string
    filledPricesOnly?: boolean
    outOfStockOnly?: boolean
    pricelistOwner?: string
  } = {}
): Promise<CatalogProductsPage> {
  const safeLimit = Math.min(500, Math.max(1, limit))
  const safePage = Math.max(1, page)
  const offset = (safePage - 1) * safeLimit

  const [categoryFilterOpts, hasBrandsTable, useFulltext, brandId] = await Promise.all([
    resolveAdminCategoryFilterOptions(options.categoryId),
    brandsTableExists(),
    productsFulltextSearchAvailable(),
    resolveCatalogQueryBrandId(options.brand),
  ])

  const needsCategoryJoin = adminListingNeedsCategoryJoin(options, categoryFilterOpts)
  const needsBrandJoin = Boolean(
    hasBrandsTable &&
      ((options.brand && options.brand !== 'All') || String(options.search ?? '').trim())
  )
  const needsPricelistJoin = false

  const { whereSql, params } = buildAdminProductFilters({
    status: options.status,
    search: options.search,
    brand: options.brand,
    brandId,
    category: options.categoryId ? undefined : options.category,
    ...categoryFilterOpts,
    includeBrandJoin: needsBrandJoin,
    useFulltextSearch: useFulltext,
  })

  let extraJoinSql = ''
  let filledWhereSql = whereSql
  let filledParams = params

  const pricelistOwnerId =
    options.filledPricesOnly || options.outOfStockOnly
      ? (await resolvePricelistOwnerId(options.pricelistOwner)) ?? PLATFORM_PRICELIST_OWNER_ID
      : null

  if (options.filledPricesOnly && pricelistOwnerId) {
    const filled = buildAdminProductFilledPricelistPriceSql(pricelistOwnerId)
    if (filled) {
      extraJoinSql = filled.joinSql
      filledParams = [...params, ...filled.params]
      filledWhereSql = filledWhereSql
        ? `${filledWhereSql} AND ${filled.whereSql}`
        : `WHERE ${filled.whereSql}`
    }
  }

  if (options.outOfStockOnly && pricelistOwnerId) {
    const outOfStock = buildAdminProductOutOfStockPricelistSql(pricelistOwnerId)
    if (outOfStock) {
      if (!extraJoinSql && outOfStock.joinSql) {
        extraJoinSql = outOfStock.joinSql
      }
      filledParams = [...filledParams, ...outOfStock.params]
      filledWhereSql = filledWhereSql
        ? `${filledWhereSql} AND ${outOfStock.whereSql}`
        : `WHERE ${outOfStock.whereSql}`
    }
  }

  const fromClause = await adminListingFromSql({
    needsCategoryJoin,
    needsBrandJoin,
    needsPricelistJoin: Boolean(extraJoinSql),
  })
  const fromWithJoin = `${fromClause}${extraJoinSql}`
  const needsGroupBy = needsBrandJoin || Boolean(extraJoinSql)

  const [countRows, idRows] = await Promise.all([
    queryDb<{ total: number }[]>(
      needsGroupBy
        ? `SELECT COUNT(DISTINCT p.id) AS total ${fromWithJoin} ${filledWhereSql}`
        : `SELECT COUNT(*) AS total ${fromWithJoin} ${filledWhereSql}`,
      filledParams
    ),
    queryDb<{ id: string }[]>(
      needsGroupBy
        ? `SELECT p.id ${fromWithJoin} ${filledWhereSql} GROUP BY p.id ORDER BY MAX(p.created_at) DESC LIMIT ? OFFSET ?`
        : `SELECT p.id ${fromWithJoin} ${filledWhereSql} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [...filledParams, safeLimit, offset]
    ),
  ])

  const total = Number(countRows[0]?.total ?? 0)
  const rows = await fetchProductRowsByIds(idRows.map((r) => String(r.id)), {
    adminList: true,
  })

  return {
    items: (await serializeProductRows(rows, {
      includePurchasePrice: true,
      adminList: true,
    })) as unknown as CatalogProductsPage['items'],
    total,
    page: safePage,
    pageSize: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit) || 1),
  }
}

/** Aggregate product counts for admin dashboard cards. */
export async function getProductDashboardStats(): Promise<ProductDashboardStats> {
  return getCachedValue(
    PRODUCT_DASHBOARD_STATS_CACHE_NS,
    'all',
    PRODUCT_DASHBOARD_STATS_CACHE_TTL_MS,
    loadProductDashboardStatsFromDb
  )
}

async function loadProductDashboardStatsFromDb(): Promise<ProductDashboardStats> {
  const rows = await queryDb<{ status: string; count: number; import_drafts: number }[]>(
    `SELECT
       status,
       COUNT(*) AS count,
       SUM(CASE WHEN source_album_id IS NOT NULL AND source_album_id != '' THEN 1 ELSE 0 END) AS import_drafts
     FROM products
     GROUP BY status`
  )

  let active = 0
  let draft = 0
  let inactive = 0
  let trash = 0
  let importDrafts = 0

  for (const row of rows) {
    const count = Number(row.count ?? 0)
    const status = String(row.status || '').toLowerCase()
    if (status === 'active') active = count
    else if (status === 'draft') {
      draft = count
      importDrafts = Number(row.import_drafts ?? 0)
    } else if (status === 'inactive') inactive = count
    else if (status === 'trash') trash = count
  }

  const outOfStock = await countAdminProductsOutOfStock(PLATFORM_PRICELIST_OWNER_ID)

  return {
    total: active + draft + inactive,
    active,
    draft,
    inactive,
    trash,
    importDrafts,
    outOfStock,
  }
}

async function countAdminProductsOutOfStock(listOwnerId: string): Promise<number> {
  try {
    const fragment = buildAdminProductOutOfStockPricelistSql(listOwnerId)
    if (!fragment) return 0

    const fromWithJoin = `FROM products p${fragment.joinSql}`
    const whereSql = `WHERE p.status <> 'trash' AND ${fragment.whereSql}`

    const rows = await queryDb<{ total: number }[]>(
      `SELECT COUNT(DISTINCT p.id) AS total ${fromWithJoin} ${whereSql}`,
      fragment.params
    )
    return Number(rows[0]?.total ?? 0)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes("doesn't exist") || message.includes('seller_product_prices')) {
      return 0
    }
    throw error
  }
}

async function buildSellerProductFilters(
  sellerId: string,
  sellerName: string
): Promise<{ whereSql: string; params: unknown[] }> {
  const schema = await getProductSchemaFlags()
  const name = sellerName.trim()

  if (schema.authorId) {
    return {
      whereSql: `WHERE p.author_id = ? OR (p.author_id IS NULL AND LOWER(TRIM(p.author)) = LOWER(TRIM(?)))`,
      params: [sellerId, name],
    }
  }

  return {
    whereSql: `WHERE LOWER(TRIM(p.author)) = LOWER(TRIM(?))`,
    params: [name],
  }
}

/** Products owned by a seller (author_id or legacy author name match). */
export async function listProductsForSeller(sellerId: string, sellerName: string) {
  const select = await productSelectSql()
  const { whereSql, params } = await buildSellerProductFilters(sellerId, sellerName)
  const rows = await queryDb<Record<string, unknown>[]>(
    `${select} ${whereSql} ORDER BY p.created_at DESC`,
    params
  )
  return await serializeProductRows(rows)
}

/** Paginated seller-owned products — avoids loading the full catalog into memory. */
export async function listProductsForSellerPaginated(
  sellerId: string,
  sellerName: string,
  page: number,
  limit: number
): Promise<CatalogProductsPage> {
  const safeLimit = Math.min(120, Math.max(1, limit))
  const safePage = Math.max(1, page)
  const offset = (safePage - 1) * safeLimit

  const [select, { whereSql, params }] = await Promise.all([
    productSelectSql(),
    buildSellerProductFilters(sellerId, sellerName),
  ])
  const fromIndex = select.search(/\bFROM\b/i)
  const fromClause = fromIndex >= 0 ? select.slice(fromIndex) : 'FROM products p'

  const [countRows, idRows] = await Promise.all([
    queryDb<{ total: number }[]>(
      `SELECT COUNT(DISTINCT p.id) AS total ${fromClause} ${whereSql}`,
      params
    ),
    queryDb<{ id: string }[]>(
      `SELECT p.id ${fromClause} ${whereSql} GROUP BY p.id ORDER BY MAX(p.created_at) DESC LIMIT ? OFFSET ?`,
      [...params, safeLimit, offset]
    ),
  ])

  const total = Number(countRows[0]?.total ?? 0)
  const rows = await fetchProductRowsByIds(idRows.map((r) => String(r.id)))

  return {
    items: (await serializeProductRows(rows)) as unknown as CatalogProductsPage['items'],
    total,
    page: safePage,
    pageSize: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit) || 1),
  }
}

/** Draft products created by Yupoo import (for admin review queue). */
export async function listDraftImportProducts(limit = 100) {
  const select = await productSelectSql()
  const rows = await queryDb<Record<string, unknown>[]>(
    `${select}
     WHERE p.status = 'draft' AND p.source_album_id IS NOT NULL
     ORDER BY p.created_at DESC
     LIMIT ?`,
    [limit]
  )
  return await serializeProductRows(rows)
}

export async function getProductById(
  id: string,
  options?: Pick<SerializeProductRowOptions, 'includePurchasePrice' | 'storageImages'>
) {
  return fetchProductRow(id, options)
}

export async function deleteProductById(id: string) {
  await queryDb('DELETE FROM products WHERE id = ?', [id])
  invalidateProductDashboardStatsCache()
}

async function deleteProductRelatedRows(productIds: string[]): Promise<void> {
  if (!productIds.length) return
  const placeholders = productIds.map(() => '?').join(', ')
  try {
    await queryDb(
      `DELETE FROM catalog_product_positions WHERE product_id IN (${placeholders})`,
      productIds
    )
  } catch {
    /* table may not exist on older databases */
  }
}

/** Hard-delete products that are already in trash (ignores non-trash ids). */
export async function permanentlyDeleteTrashProducts(productIds: string[]): Promise<number> {
  if (!productIds.length) return 0

  const placeholders = productIds.map(() => '?').join(', ')
  const rows = await queryDb<{ id: string }[]>(
    `SELECT id FROM products WHERE id IN (${placeholders}) AND status = 'trash'`,
    productIds
  )
  const ids = rows.map((r) => r.id)
  if (!ids.length) return 0

  await deleteProductRelatedRows(ids)
  const ph = ids.map(() => '?').join(', ')
  const result = await queryDb<{ affectedRows?: number }>(
    `DELETE FROM products WHERE id IN (${ph})`,
    ids
  )
  return result?.affectedRows ?? ids.length
}

/** Permanently remove every product in trash. */
export async function emptyProductTrash(): Promise<number> {
  const rows = await queryDb<{ id: string }[]>(
    `SELECT id FROM products WHERE status = 'trash'`
  )
  return permanentlyDeleteTrashProducts(rows.map((r) => r.id))
}

export type ProductStatusValue = 'active' | 'draft' | 'inactive' | 'trash'

export type BulkProductPatch = {
  category?: string
  brand?: string | null
  price?: number
  original_price?: number | null
  purchase_price?: number | null
  status?: ProductStatusValue
}

export type BulkUpdateProductsResult = {
  updated: number
  trashedDuplicates: number
  skippedAlreadyCorrect: number
}

type ProductBulkRow = {
  id: string
  sku: string | null
  category: string | null
  brand: string | null
  brand_id: string | null
  category_id: string | null
  source_album_id: string | null
  status: string
}

async function fetchProductsForBulkUpdate(ids: string[]): Promise<ProductBulkRow[]> {
  if (!ids.length) return []
  const placeholders = ids.map(() => '?').join(', ')
  return queryDb<ProductBulkRow[]>(
    `SELECT id, sku, category, brand, brand_id, category_id, source_album_id, status
     FROM products WHERE id IN (${placeholders})`,
    ids
  )
}

function brandNamesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  return String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase()
}

function categoryNamesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  return String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase()
}

function isSkuUniqueConstraintError(err: unknown): boolean {
  const code = (err as { code?: string })?.code
  if (code !== 'ER_DUP_ENTRY') return false
  const message = String((err as { message?: string })?.message ?? '').toLowerCase()
  return message.includes('uq_products_sku') || message.includes("key 'sku'")
}

function isSourceAlbumBrandConstraintError(err: unknown): boolean {
  const code = (err as { code?: string })?.code
  if (code !== 'ER_DUP_ENTRY') return false
  const message = String((err as { message?: string })?.message ?? '').toLowerCase()
  return (
    message.includes('uq_products_source_album_brand') ||
    message.includes('source_album_brand')
  )
}

/**
 * Free the (source_album_id, brand) unique slot for `keepProductId`.
 * Trashed rows still occupy the index — their album link is cleared instead.
 */
async function releaseSourceAlbumBrandSlot(
  albumId: string,
  brandName: string | null,
  keepProductId: string
): Promise<number> {
  const album = albumId.trim()
  if (!album) return 0

  const brandKey = brandName?.trim() ?? ''
  const rows = await queryDb<{ id: string; status: string }[]>(
    `SELECT id, status FROM products
     WHERE source_album_id = ?
       AND LOWER(TRIM(COALESCE(brand, ''))) = LOWER(TRIM(?))
       AND id <> ?`,
    [album, brandKey, keepProductId]
  )

  let handled = 0
  for (const row of rows) {
    if (row.status === 'trash') {
      await queryDb(`UPDATE products SET source_album_id = NULL WHERE id = ?`, [row.id])
    } else {
      await queryDb(`UPDATE products SET status = 'trash' WHERE id = ?`, [row.id])
    }
    handled++
  }
  return handled
}

type BulkPatchOutcome = {
  status: 'updated' | 'trashed' | 'skipped'
  conflictsResolved: number
}

async function applyBulkPatchToProduct(
  row: ProductBulkRow,
  patch: BulkProductPatch,
  resolved: {
    category?: { id: string; name: string }
    brand?: { id?: string; name: string | null }
  }
): Promise<BulkPatchOutcome> {
  const targetBrandName =
    patch.brand !== undefined
      ? patch.brand?.trim()
        ? resolved.brand?.name ?? patch.brand.trim()
        : null
      : undefined
  const targetCategoryName =
    patch.category !== undefined ? resolved.category?.name ?? patch.category : undefined

  const brandAlready =
    patch.brand !== undefined &&
    (patch.brand === null || patch.brand === ''
      ? !row.brand?.trim() && !row.brand_id?.trim()
      : brandNamesMatch(row.brand, targetBrandName ?? patch.brand))

  const categoryAlready =
    patch.category !== undefined && categoryNamesMatch(row.category, targetCategoryName)

  const needsBrandChange = patch.brand !== undefined && !brandAlready
  const needsCategoryChange = patch.category !== undefined && !categoryAlready
  const needsPriceChange =
    patch.price !== undefined ||
    patch.original_price !== undefined ||
    patch.purchase_price !== undefined
  const needsStatusChange = patch.status !== undefined

  if (!needsBrandChange && !needsCategoryChange && !needsPriceChange && !needsStatusChange) {
    return { status: 'skipped', conflictsResolved: 0 }
  }

  let conflictsResolved = 0

  const skuDuplicate = await findProductBySku(row.sku, row.id)
  if (skuDuplicate && skuDuplicate.status !== 'trash') {
    await queryDb(`UPDATE products SET status = 'trash' WHERE id = ?`, [skuDuplicate.id])
    conflictsResolved++
  }

  if (needsBrandChange && row.source_album_id?.trim()) {
    const brandForSlot =
      targetBrandName !== undefined ? targetBrandName : row.brand
    conflictsResolved += await releaseSourceAlbumBrandSlot(
      row.source_album_id,
      brandForSlot ?? null,
      row.id
    )
  }

  const setParts: string[] = []
  const setValues: unknown[] = []
  const schema = await getProductSchemaFlags()
  const hasBrandCol = await productsHaveBrandColumn()
  const hasBrandId = await productsHaveBrandIdColumn()

  if (patch.category !== undefined && !categoryAlready) {
    setParts.push('category = ?')
    setValues.push(resolved.category!.name)
    if (schema.categoryId) {
      setParts.push('category_id = ?')
      setValues.push(resolved.category!.id)
    }
  }

  if (patch.brand !== undefined && !brandAlready && (await brandsTableExists())) {
    if (!targetBrandName) {
      if (hasBrandCol) {
        setParts.push('brand = ?')
        setValues.push(null)
      }
      if (hasBrandId) {
        setParts.push('brand_id = ?')
        setValues.push(null)
      }
    } else {
      if (hasBrandCol) {
        setParts.push('brand = ?')
        setValues.push(resolved.brand!.name)
      }
      if (hasBrandId && resolved.brand?.id) {
        setParts.push('brand_id = ?')
        setValues.push(resolved.brand.id)
      }
    }
  }

  if (patch.price !== undefined) {
    setParts.push('price = ?')
    setValues.push(patch.price)
  }

  if (patch.original_price !== undefined) {
    setParts.push('original_price = ?')
    setValues.push(patch.original_price)
  }

  if (patch.purchase_price !== undefined) {
    setParts.push('purchase_price = ?')
    setValues.push(patch.purchase_price)
  }

  if (patch.status !== undefined) {
    setParts.push('status = ?')
    setValues.push(patch.status)
  }

  if (!setParts.length) return { status: 'skipped', conflictsResolved }

  const runUpdate = () =>
    queryDb(`UPDATE products SET ${setParts.join(', ')} WHERE id = ?`, [
      ...setValues,
      row.id,
    ])

  try {
    await runUpdate()
    return { status: 'updated', conflictsResolved }
  } catch (err: unknown) {
    if (isSourceAlbumBrandConstraintError(err) && needsBrandChange && row.source_album_id?.trim()) {
      conflictsResolved += await releaseSourceAlbumBrandSlot(
        row.source_album_id,
        targetBrandName ?? null,
        row.id
      )
      if (conflictsResolved > 0) {
        await runUpdate()
        return { status: 'updated', conflictsResolved }
      }
    }
    if (isSkuUniqueConstraintError(err)) {
      const other = await findProductBySku(row.sku, row.id)
      if (other && other.status !== 'trash') {
        await queryDb(`UPDATE products SET status = 'trash' WHERE id = ?`, [other.id])
        conflictsResolved++
        await runUpdate()
        return { status: 'updated', conflictsResolved }
      }
    }
    throw err
  }
}

/** Apply field changes to many products; trashes duplicates instead of failing. */
export async function bulkUpdateProducts(
  productIds: string[],
  patch: BulkProductPatch
): Promise<BulkUpdateProductsResult> {
  if (!productIds.length) {
    return { updated: 0, trashedDuplicates: 0, skippedAlreadyCorrect: 0 }
  }

  const hasChanges =
    patch.category !== undefined ||
    patch.brand !== undefined ||
    patch.price !== undefined ||
    patch.original_price !== undefined ||
    patch.purchase_price !== undefined ||
    patch.status !== undefined

  if (!hasChanges) {
    return { updated: 0, trashedDuplicates: 0, skippedAlreadyCorrect: 0 }
  }

  const resolved: {
    category?: { id: string; name: string }
    brand?: { id?: string; name: string | null }
  } = {}

  if (patch.category !== undefined) {
    resolved.category = await resolveBulkCategoryInput(patch.category)
  }

  if (patch.brand !== undefined && patch.brand?.trim() && (await brandsTableExists())) {
    resolved.brand = await resolveBulkBrandInput(patch.brand.trim())
  } else if (patch.brand !== undefined) {
    resolved.brand = { name: null }
  }

  const rows = await fetchProductsForBulkUpdate(productIds)
  const byId = new Map(rows.map((r) => [r.id, r]))

  let updated = 0
  let trashedDuplicates = 0
  let skippedAlreadyCorrect = 0

  for (const id of productIds) {
    const row = byId.get(id)
    if (!row) continue

    const outcome = await applyBulkPatchToProduct(row, patch, resolved)
    if (outcome.status === 'updated') updated++
    else if (outcome.status === 'trashed') trashedDuplicates++
    else skippedAlreadyCorrect++
    if (outcome.conflictsResolved > 0) {
      trashedDuplicates += outcome.conflictsResolved
    }
  }

  return { updated, trashedDuplicates, skippedAlreadyCorrect }
}

export async function bulkUpdateProductStatus(
  productIds: string[],
  status: ProductStatusValue
): Promise<number> {
  if (!productIds.length) return 0
  const placeholders = productIds.map(() => '?').join(', ')
  const result = await queryDb<{ affectedRows?: number }>(
    `UPDATE products SET status = ? WHERE id IN (${placeholders})`,
    [status, ...productIds]
  )
  syncPricelistAfterCatalogStatusChange(productIds, status)
  invalidateProductDashboardStatsCache()
  return result?.affectedRows ?? productIds.length
}

/** Publish every product currently in `fromStatus` (e.g. all drafts). */
export async function bulkUpdateProductStatusByFilter(
  fromStatus: ProductStatusValue,
  toStatus: ProductStatusValue
): Promise<number> {
  const result = await queryDb<{ affectedRows?: number }>(
    `UPDATE products SET status = ? WHERE status = ?`,
    [toStatus, fromStatus]
  )
  if (shouldSyncPricelistOutOfStock(toStatus)) {
    const rows = await queryDb<{ id: string }[]>(
      `SELECT id FROM products WHERE status = ?`,
      [toStatus]
    )
    syncPricelistAfterCatalogStatusChange(
      rows.map((r) => String(r.id)),
      toStatus
    )
  }
  invalidateProductDashboardStatsCache()
  return result?.affectedRows ?? 0
}

export type BulkArchiveProductsInput = {
  categoryIds?: string[]
  brands?: string[]
  /** Products with Yupoo source_album_date strictly before this calendar date (YYYY-MM-DD). */
  albumDateBefore: string
  status: 'inactive' | 'trash'
}

async function resolveUnionCategoryFilter(
  selectedCategoryIds: string[]
): Promise<
  Pick<AdminProductFilterOptions, 'categoryIds' | 'legacyCategoryNames' | 'excludeCategoryIds'>
> {
  if (!selectedCategoryIds.length) return {}

  const allIds = new Set<string>()
  const allLegacy = new Set<string>()
  const allExclude = new Set<string>()

  for (const id of selectedCategoryIds) {
    const opts = await resolveAdminCategoryFilterOptions(id)
    for (const cid of opts.categoryIds ?? []) allIds.add(cid)
    for (const name of opts.legacyCategoryNames ?? []) allLegacy.add(name)
    for (const eid of opts.excludeCategoryIds ?? []) allExclude.add(eid)
  }

  if (!allIds.size && !allLegacy.size) {
    return { categoryIds: [] }
  }

  return {
    categoryIds: Array.from(allIds),
    legacyCategoryNames: Array.from(allLegacy),
    excludeCategoryIds: Array.from(allExclude),
  }
}

async function bulkArchiveFromClause(): Promise<{
  fromClause: string
  hasBrandsTable: boolean
}> {
  const [select, hasBrandsTable] = await Promise.all([productSelectSql(), brandsTableExists()])
  const fromIndex = select.search(/\bFROM\b/i)
  const fromClause = fromIndex >= 0 ? select.slice(fromIndex) : 'FROM products p'
  return { fromClause, hasBrandsTable }
}

async function buildBulkArchiveQuery(input: {
  categoryIds?: string[]
  brands?: string[]
  albumDateBefore: string
}) {
  const categoryOpts = input.categoryIds?.length
    ? await resolveUnionCategoryFilter(input.categoryIds)
    : {}

  const { fromClause, hasBrandsTable } = await bulkArchiveFromClause()
  const { whereSql, params } = buildBulkArchiveProductFilters({
    ...categoryOpts,
    brands: input.brands,
    albumDateBefore: input.albumDateBefore,
    includeBrandJoin: hasBrandsTable,
  })

  return { fromClause, whereSql, params }
}

export async function countBulkArchiveProducts(
  input: Omit<BulkArchiveProductsInput, 'status'>
): Promise<number> {
  const { fromClause, whereSql, params } = await buildBulkArchiveQuery(input)
  const rows = await queryDb<{ total: number }[]>(
    `SELECT COUNT(DISTINCT p.id) AS total ${fromClause} ${whereSql}`,
    params
  )
  return Number(rows[0]?.total ?? 0)
}

/** Set matching active/draft products to inactive or trash (by category, brand, created date). */
export async function bulkArchiveProducts(input: BulkArchiveProductsInput): Promise<number> {
  const { fromClause, whereSql, params } = await buildBulkArchiveQuery(input)
  const idRows = await queryDb<{ id: string }[]>(
    `SELECT DISTINCT p.id ${fromClause} ${whereSql}`,
    params
  )
  const ids = idRows.map((row) => String(row.id)).filter(Boolean)
  if (!ids.length) return 0
  return bulkUpdateProductStatus(ids, input.status)
}

/** Distinct vendor names on products (for analytics). */
export async function countDistinctProductVendors(): Promise<number> {
  const rows = await queryDb<{ vendors: number }[]>(
    `SELECT COUNT(DISTINCT LOWER(TRIM(author))) AS vendors
     FROM products
     WHERE author IS NOT NULL AND TRIM(author) != ''`
  )
  return Number(rows[0]?.vendors ?? 0)
}

/** Soft-delete: move products to trash (not removed from database). */
export async function bulkMoveProductsToTrash(productIds: string[]): Promise<number> {
  return bulkUpdateProductStatus(productIds, 'trash')
}

/** @deprecated Use bulkMoveProductsToTrash — kept as alias for admin delete routes. */
export async function bulkDeleteProducts(productIds: string[]): Promise<number> {
  return bulkMoveProductsToTrash(productIds)
}

export async function listCategories(activeOnly = false) {
  const base = `SELECT c.*, p.name AS parent_name
    FROM categories c
    LEFT JOIN categories p ON p.id = c.parent_id`
  if (activeOnly) {
    return queryDb<any[]>(
      `${base} WHERE c.active = 1 ORDER BY COALESCE(c.sort_order, 9999), c.name ASC`
    )
  }
  return queryDb<any[]>(`${base} ORDER BY c.name ASC`)
}

async function assertValidCategoryParent(
  categoryId: string | null,
  parentId: string | null | undefined,
  categoryName?: string
) {
  const parent = parentId?.trim() || null
  if (!parent) return null
  if (categoryId && parent === categoryId) {
    throw new Error('A category cannot be its own parent')
  }
  const parentRow = await getCategoryById(parent)
  if (!parentRow) {
    throw new Error('Parent category not found')
  }
  let cursor: string | null = parent
  const seen = new Set<string>()
  while (cursor) {
    if (categoryId && cursor === categoryId) {
      throw new Error('Invalid parent category (circular reference)')
    }
    if (seen.has(cursor)) break
    seen.add(cursor)
    const row: Awaited<ReturnType<typeof getCategoryById>> =
      cursor === parent ? parentRow : await getCategoryById(cursor)
    if (!row) break
    cursor = row.parent_id ? String(row.parent_id) : null
  }
  const name = categoryName?.trim()
  if (name && isQualifiedSiblingCategory(String(parentRow.name ?? ''), name)) {
    throw new Error(
      `${name} is a separate top-level category, not a subcategory of ${parentRow.name}`
    )
  }
  return parent
}

export async function insertCategory(input: {
  name: string
  slug: string
  description?: string
  parent_id?: string | null
}) {
  const parent_id = await assertValidCategoryParent(null, input.parent_id, input.name)
  const id = randomUUID()
  await queryDb(
    'INSERT INTO categories (id, name, slug, description, parent_id, active) VALUES (?, ?, ?, ?, ?, 1)',
    [id, input.name, input.slug, input.description || null, parent_id]
  )
  const rows = await queryDb<any[]>(
    `SELECT c.*, p.name AS parent_name
     FROM categories c
     LEFT JOIN categories p ON p.id = c.parent_id
     WHERE c.id = ? LIMIT 1`,
    [id]
  )
  return rows[0]
}

export async function getCategoryById(id: string) {
  const rows = await queryDb<any[]>(
    `SELECT c.*, p.name AS parent_name
     FROM categories c
     LEFT JOIN categories p ON p.id = c.parent_id
     WHERE c.id = ? LIMIT 1`,
    [id]
  )
  return rows[0] ?? null
}

export async function updateCategoryById(
  id: string,
  input: { name: string; slug: string; description?: string; active?: boolean; parent_id?: string | null }
) {
  const prev = await getCategoryById(id)
  const parent_id = await assertValidCategoryParent(id, input.parent_id, input.name)

  await queryDb(
    'UPDATE categories SET name = ?, slug = ?, description = ?, active = ?, parent_id = ? WHERE id = ?',
    [
      input.name,
      input.slug,
      input.description || null,
      input.active === false ? 0 : 1,
      parent_id,
      id,
    ]
  )

  if (await productsHaveCategoryIdColumn()) {
    await queryDb('UPDATE products SET category = ? WHERE category_id = ?', [
      input.name,
      id,
    ])
  } else if (prev?.name) {
    await queryDb('UPDATE products SET category = ? WHERE category = ?', [
      input.name,
      prev.name,
    ])
  }

  return getCategoryById(id)
}

export async function deleteCategoryById(id: string) {
  await queryDb('DELETE FROM categories WHERE id = ?', [id])
}

export type ProductDuplicateScanRow = {
  id: string
  name: string
  sku: string | null
  status: string
  brand: string | null
  image_url: string
  source_url: string | null
  gallery_images: string[] | null
}

export type ProductImageDuplicateScanRow = ProductDuplicateScanRow

/** Lightweight product list for admin duplicate scans (excludes trash by default). */
export async function listProductsForDuplicateScan(options?: {
  includeTrash?: boolean
}): Promise<ProductDuplicateScanRow[]> {
  const includeTrash = options?.includeTrash === true
  const where = includeTrash ? '' : "WHERE p.status <> 'trash'"
  const rows = await queryDb<Record<string, unknown>[]>(
    `SELECT p.id, p.name, p.sku, p.status, p.brand, p.image_url, p.source_url, p.gallery_images
     FROM products p
     ${where}
     ORDER BY p.name ASC`
  )

  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ''),
    sku: row.sku == null || row.sku === '' ? null : String(row.sku),
    status: String(row.status ?? 'active'),
    brand: row.brand == null || row.brand === '' ? null : String(row.brand),
    image_url: String(row.image_url ?? ''),
    source_url: row.source_url == null || row.source_url === '' ? null : String(row.source_url),
    gallery_images: parseProductJsonField(row.gallery_images),
  }))
}

/** @deprecated Use listProductsForDuplicateScan */
export async function listProductsForImageDuplicateScan(options?: {
  includeTrash?: boolean
}): Promise<ProductImageDuplicateScanRow[]> {
  return listProductsForDuplicateScan(options)
}
