import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'
import { slugifyCategory } from '@/lib/category-slug'
import {
  buildActiveCatalogFilters,
  buildAdminProductFilters,
  type AdminProductStatusFilter,
  type CatalogProductsPage,
  type CatalogProductsQuery,
  type ProductDashboardStats,
} from '@/lib/catalog-products'
import { loadActiveCategories } from '@/lib/categories-persistence'
import { syncTagTranslationsForTags } from '@/lib/tag-translations-db'
import { sanitizeProductDescriptions, sanitizeProductName } from '@/lib/yupoo/import-text'
import {
  getDirectChildCategories,
  isQualifiedSiblingCategory,
  resolveShopCategoryFilter,
} from '@/lib/shop-category-tree'
import { serializeProductRow } from '@/lib/product-serialize'
import {
  brandsTableExists,
  productsHaveBrandColumn,
  productsHaveBrandIdColumn,
  resolveProductBrandInput,
  UnknownBrandError,
} from '@/lib/brands-db'
import { getBrandSkuPrefixes } from '@/lib/brand-sku-prefixes'
import { catalogPositionJoin } from '@/lib/catalog-positions-db'
import { catalogSortScope } from '@/lib/catalog-sort-scope'
import {
  DuplicateSkuError,
  MissingSkuError,
  normalizeProductSku,
  requireProductSku,
} from '@/lib/product-sku'

export { UnknownBrandError } from '@/lib/brands-db'

export type ProductInput = {
  name: string
  description: string
  short_description?: string
  price: number
  original_price?: number | null
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
  available_sizes?: string | null
  available_colors?: string | null
  source_url?: string | null
  source_album_id?: string | null
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
  source_url: boolean
  source_album_id: boolean
}

const SCHEMA_CACHE_KEY = '__catalogusProductSchema'
const SELECT_SQL_CACHE_KEY = '__catalogusProductSelectSql'

type GlobalSchema = typeof globalThis & {
  [SCHEMA_CACHE_KEY]?: ProductSchemaFlags
  [SELECT_SQL_CACHE_KEY]?: string
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
           'available_sizes', 'available_colors', 'source_url', 'source_album_id'
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
      source_url: names.has('source_url'),
      source_album_id: names.has('source_album_id'),
    }
  } catch {
    g[SCHEMA_CACHE_KEY] = {
      categoryId: false,
      authorId: false,
      compatibility: false,
      support_url: false,
      available_sizes: false,
      available_colors: false,
      source_url: false,
      source_album_id: false,
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

async function productSelectSql() {
  const g = globalThis as GlobalSchema
  if (g[SELECT_SQL_CACHE_KEY]) return g[SELECT_SQL_CACHE_KEY]

  const hasCategoryId = await productsHaveCategoryIdColumn()
  const hasBrandsTable = await brandsTableExists()
  const hasBrandId = hasBrandsTable && (await productsHaveBrandIdColumn())
  /** Prefer FK when set; name match only for legacy rows without category_id / brand_id. */
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

  g[SELECT_SQL_CACHE_KEY] = `
    SELECT
      p.*,
      c.id AS resolved_category_id,
      c.name AS resolved_category_name,
      c.slug AS resolved_category_slug${brandSelect}
    FROM products p
    ${categoryJoin}
    ${brandJoin}
  `
  return g[SELECT_SQL_CACHE_KEY]
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

async function serializeProductRows(rows: Record<string, unknown>[]) {
  const brandSkuPrefixes = await getBrandSkuPrefixes()
  return dedupeProductRows(rows).map((row) =>
    serializeProductRow(row, { brandSkuPrefixes })
  )
}

async function fetchProductRowsByIds(ids: string[]): Promise<Record<string, unknown>[]> {
  if (!ids.length) return []
  const select = await productSelectSql()
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

/** Resolve category for bulk edit; supports compound labels (e.g. "SHOES / BAGS"). */
async function resolveBulkCategoryInput(categoryName: string): Promise<{ id: string; name: string }> {
  const trimmed = categoryName.trim()
  try {
    return await resolveProductCategoryInput(trimmed)
  } catch (err) {
    if (!(err instanceof UnknownCategoryError)) throw err
    const firstSegment = trimmed.split('/').map((s) => s.trim()).find(Boolean)
    if (firstSegment) {
      const resolved = await resolveCategoryByName(firstSegment)
      if (resolved) return { id: resolved.id, name: trimmed }
    }
    throw err
  }
}

/** Resolve brand for bulk edit; supports collab labels (e.g. "Supreme X Nike"). */
async function resolveBulkBrandInput(
  brandName: string
): Promise<{ id?: string; name: string | null }> {
  try {
    return await resolveProductBrandInput(brandName)
  } catch (err) {
    if (err instanceof UnknownBrandError) {
      return { name: brandName, id: undefined }
    }
    throw err
  }
}

async function resolveProductCategoryInput(
  categoryName: string,
  categoryId?: string | null
) {
  if (categoryId?.trim()) {
    const byId = await resolveCategoryById(categoryId)
    if (byId) return byId
  }
  const trimmed = categoryName.trim()
  if (!trimmed) throw new UnknownCategoryError('')
  if (trimmed.includes('/')) {
    return resolveBulkCategoryInput(trimmed)
  }
  const resolved = await resolveCategoryByName(trimmed)
  if (!resolved) throw new UnknownCategoryError(trimmed)
  return resolved
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

/** Active subcategories under a parent that have at least one active product. */
export async function listShopSubcategoriesWithProducts(
  parentCategoryName: string,
  brandName?: string
): Promise<ShopSubcategoryOption[]> {
  const categories = await loadActiveCategories()
  const children = getDirectChildCategories(categories, parentCategoryName)
  if (!children.length) return []

  const childIds = children.map((row) => row.id)
  const idPlaceholders = childIds.map(() => '?').join(', ')

  const brand = brandName?.trim()
  const brandClause =
    brand && brand !== 'All'
      ? `AND (
           LOWER(TRIM(p.brand)) = LOWER(?)
           OR EXISTS (
             SELECT 1 FROM brands b
             WHERE b.active = 1 AND b.id = p.brand_id AND LOWER(TRIM(b.name)) = LOWER(?)
           )
         )`
      : ''
  const brandParams = brand && brand !== 'All' ? [brand, brand] : []

  const rows = await queryDb<{ id: string; name: string; productCount: number }[]>(
    `SELECT c.id, c.name, COUNT(DISTINCT p.id) AS productCount
     FROM categories c
     INNER JOIN products p ON p.status = 'active' AND p.category_id = c.id
     ${brandClause}
     WHERE c.id IN (${idPlaceholders}) AND c.active = 1
     GROUP BY c.id, c.name
     HAVING productCount > 0
     ORDER BY c.name ASC`,
    [...brandParams, ...childIds]
  )

  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    productCount: Number(row.productCount ?? 0),
  }))
}

async function fetchProductRow(id: string) {
  const select = await productSelectSql()
  const rows = await queryDb<Record<string, unknown>[]>(
    `${select} WHERE p.id = ? LIMIT 1`,
    [id]
  )
  if (!rows[0]) return null
  const brandSkuPrefixes = await getBrandSkuPrefixes()
  return serializeProductRow(rows[0], { brandSkuPrefixes })
}

export async function insertProduct(input: ProductInput) {
  const category = await resolveProductCategoryInput(input.category, input.category_id)
  const brand =
    (await brandsTableExists()) ? await resolveBrandForStorage(input.brand) : { name: null, id: undefined }
  const brandPrefixes = await getBrandSkuPrefixes()
  const sku = requireProductSku(input.sku, brandPrefixes)
  await assertSkuIsUnique(sku)

  const id = randomUUID()
  const schema = await getProductSchemaFlags()
  const hasCategoryId = schema.categoryId
  const hasBrandCol = await productsHaveBrandColumn()
  const hasBrandId = await productsHaveBrandIdColumn()
  const contentCols = await productsContentColumns()
  const productName = sanitizeProductName(String(input.name ?? '').trim())
  const { description, short_description } = sanitizeProductDescriptions(
    productName,
    input.description,
    input.short_description,
    brand.name
  )

  const insertMap: Record<string, unknown> = {
    id,
    name: productName,
    description,
    short_description,
    price: input.price,
    original_price: input.original_price ?? null,
    image_url: input.image_url,
    gallery_images: jsonCol(input.gallery_images),
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
    ...(schema.available_sizes && input.available_sizes !== undefined
      ? { available_sizes: input.available_sizes || null }
      : {}),
    ...(schema.available_colors && input.available_colors !== undefined
      ? { available_colors: input.available_colors || null }
      : {}),
    ...(schema.source_url && input.source_url !== undefined
      ? { source_url: input.source_url || null }
      : {}),
    ...(schema.source_album_id && input.source_album_id !== undefined
      ? { source_album_id: input.source_album_id || null }
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

  return fetchProductRow(id)
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

  const map: Record<string, unknown> = {
    name: input.name !== undefined ? sanitizeProductName(String(input.name).trim()) : undefined,
    description: input.description,
    short_description: input.short_description,
    price: input.price,
    original_price: input.original_price,
    image_url: input.image_url,
    gallery_images: input.gallery_images !== undefined ? jsonCol(input.gallery_images) : undefined,
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
    available_sizes:
      schema.available_sizes && input.available_sizes !== undefined
        ? input.available_sizes || null
        : undefined,
    available_colors:
      schema.available_colors && input.available_colors !== undefined
        ? input.available_colors || null
        : undefined,
    source_url:
      schema.source_url && input.source_url !== undefined ? input.source_url || null : undefined,
    source_album_id:
      schema.source_album_id && input.source_album_id !== undefined
        ? input.source_album_id || null
        : undefined,
  }

  if (input.description !== undefined || input.short_description !== undefined) {
    let nameForClean =
      input.name !== undefined
        ? sanitizeProductName(String(input.name).trim())
        : ''
    if (!nameForClean) {
      const nameRows = await queryDb<{ name: string }[]>(
        `SELECT name FROM products WHERE id = ? LIMIT 1`,
        [id]
      )
      nameForClean = String(nameRows[0]?.name ?? '').trim()
    }

    let brandForClean: string | null | undefined = brandName
    if (brandForClean === undefined) {
      const brandRows = await queryDb<{ brand: string | null }[]>(
        `SELECT brand FROM products WHERE id = ? LIMIT 1`,
        [id]
      )
      brandForClean = brandRows[0]?.brand?.trim() || null
    }

    if (input.description !== undefined) {
      map.description = sanitizeProductDescriptions(
        nameForClean,
        String(input.description),
        null,
        brandForClean
      ).description
    }
    if (input.short_description !== undefined) {
      map.short_description = sanitizeProductDescriptions(
        nameForClean,
        '',
        input.short_description,
        brandForClean
      ).short_description
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

  if (!fields.length) return fetchProductRow(id)

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

  return fetchProductRow(id)
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
  const [select, categories, hasBrandsTable] = await Promise.all([
    productSelectSql(),
    loadActiveCategories(),
    brandsTableExists(),
  ])
  const limit = query.limit
  const categoryFilter = resolveShopCategoryFilter(categories, {
    category: query.category,
    subcategory: query.subcategory,
  })

  if (query.category && query.category !== 'All' && !categoryFilter?.categoryIds.length) {
    return {
      items: [],
      total: 0,
      page: query.page,
      pageSize: limit,
      totalPages: 1,
    }
  }

  const { whereSql, params } = buildActiveCatalogFilters(
    {
      ...query,
      categoryIds: categoryFilter?.categoryIds,
      legacyCategoryNames: categoryFilter?.legacyNames,
      strictCategoryIdOnly: categoryFilter?.strictIdOnly,
    },
    { includeBrandJoin: hasBrandsTable }
  )
  const offset = (query.page - 1) * limit
  const fromIndex = select.search(/\bFROM\b/i)
  const fromClause = fromIndex >= 0 ? select.slice(fromIndex) : 'FROM products p'
  const sortScope = catalogSortScope(query)
  const { joinSql, orderSql, scopeParam } = await catalogPositionJoin(sortScope)
  const idParams = scopeParam ? [scopeParam, ...params] : params

  const [countRows, idRows] = await Promise.all([
    queryDb<{ total: number }[]>(
      `SELECT COUNT(DISTINCT p.id) AS total ${fromClause} ${joinSql} ${whereSql}`,
      idParams
    ),
    queryDb<{ id: string }[]>(
      `SELECT p.id ${fromClause} ${joinSql} ${whereSql} GROUP BY p.id ORDER BY ${orderSql} LIMIT ? OFFSET ?`,
      [...idParams, limit, offset]
    ),
  ])

  const total = Number(countRows[0]?.total ?? 0)
  const rows = await fetchProductRowsByIds(idRows.map((r) => String(r.id)))

  return {
    items: (await serializeProductRows(rows)) as unknown as CatalogProductsPage['items'],
    total,
    page: query.page,
    pageSize: limit,
    totalPages: Math.max(1, Math.ceil(total / limit) || 1),
  }
}

/** Paginated all products (admin dashboard snippets). */
export async function listProductsPaginated(
  page: number,
  limit: number
): Promise<CatalogProductsPage> {
  return listProductsPaginatedAdmin(page, limit)
}

/** Paginated admin catalog with optional status/search/category/brand filters in SQL. */
export async function listProductsPaginatedAdmin(
  page: number,
  limit: number,
  options: {
    status?: AdminProductStatusFilter
    search?: string
    category?: string
    brand?: string
  } = {}
): Promise<CatalogProductsPage> {
  const safeLimit = Math.min(500, Math.max(1, limit))
  const safePage = Math.max(1, page)
  const offset = (safePage - 1) * safeLimit

  const [select, hasBrandsTable] = await Promise.all([productSelectSql(), brandsTableExists()])
  const { whereSql, params } = buildAdminProductFilters({
    ...options,
    includeBrandJoin: hasBrandsTable,
  })
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

/** Aggregate product counts for admin dashboard cards. */
export async function getProductDashboardStats(): Promise<ProductDashboardStats> {
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

  return {
    total: active + draft + inactive,
    active,
    draft,
    inactive,
    trash,
    importDrafts,
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

export async function getProductById(id: string) {
  return fetchProductRow(id)
}

export async function deleteProductById(id: string) {
  await queryDb('DELETE FROM products WHERE id = ?', [id])
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
  const needsPriceChange = patch.price !== undefined || patch.original_price !== undefined
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
  return result?.affectedRows ?? 0
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
  if (categoryId && parentRow.parent_id === categoryId) {
    throw new Error('Invalid parent category (circular reference)')
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
