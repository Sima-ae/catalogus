import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'
import { slugifyCategory } from '@/lib/category-slug'
import { loadActiveCategories } from '@/lib/categories-persistence'
import {
  buildQualifiedCategoryTextMatch,
  combineCategoryIdAndLegacyTextMatch,
  buildProductBrandJoinOnSql,
  PRODUCT_CATEGORY_ID_UNSET_SQL,
} from '@/lib/catalog-products'
import { resolveShopCategoryFilter } from '@/lib/shop-category-tree'

export class UnknownBrandError extends Error {
  constructor(name: string) {
    super(`Brand "${name}" does not exist. Add it under Admin → Brands first.`)
    this.name = 'UnknownBrandError'
  }
}

export async function brandCategoriesTableExists(): Promise<boolean> {
  try {
    const rows = await queryDb<{ TABLE_NAME: string }[]>(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'brand_categories'`
    )
    return rows.length > 0
  } catch {
    return false
  }
}

/** Active brands for shop; optional category filters to brands with products in scope. */
export async function listBrands(
  activeOnly = false,
  categoryName?: string,
  subcategory?: string
) {
  const category = categoryName?.trim()

  if (activeOnly && category && category !== 'All') {
    return listActiveBrandsForShopCategory(category, subcategory)
  }

  if (activeOnly) {
    return queryDb<Record<string, unknown>[]>(
      'SELECT * FROM brands WHERE active = 1 ORDER BY COALESCE(sort_order, 9999), name ASC'
    )
  }
  return queryDb<Record<string, unknown>[]>('SELECT * FROM brands ORDER BY name ASC')
}

type ShopCategoryFilter = NonNullable<ReturnType<typeof resolveShopCategoryFilter>>

/** Brands with active products in the current category scope. */
async function listActiveBrandsByProductsInCategory(
  categoryFilter: ShopCategoryFilter,
  filterIds: string[]
): Promise<Record<string, unknown>[]> {
  const hasCategoryId = await productsHaveCategoryIdColumn()
  const idPlaceholders = filterIds.map(() => '?').join(', ')

  const brandJoinOn = buildProductBrandJoinOnSql()

  let categoryMatch = `p.category_id IN (${idPlaceholders})`
  const params: unknown[] = [...filterIds]

  const qualifiedLabels = [
    categoryFilter.categoryStorageLabel?.trim(),
    ...categoryFilter.legacyNames,
  ].filter(Boolean) as string[]

  if (hasCategoryId) {
    if (categoryFilter.strictIdOnly && qualifiedLabels.length) {
      const textMatch = buildQualifiedCategoryTextMatch(qualifiedLabels)
      const combined = combineCategoryIdAndLegacyTextMatch(categoryMatch, params, textMatch)
      categoryMatch = combined.sql
      params.length = 0
      params.push(...combined.params)
    } else if (!categoryFilter.strictIdOnly && qualifiedLabels.length) {
      const textMatch = buildQualifiedCategoryTextMatch(qualifiedLabels)
      const combined = combineCategoryIdAndLegacyTextMatch(categoryMatch, params, textMatch)
      categoryMatch = combined.sql
      params.length = 0
      params.push(...combined.params)
    }
  } else if (qualifiedLabels.length) {
    const textMatch = buildQualifiedCategoryTextMatch(qualifiedLabels)
    categoryMatch = textMatch.sql
    params.length = 0
    params.push(...textMatch.params)
  }

  const excludeIds = categoryFilter.excludeCategoryIds?.filter(Boolean)
  let excludeSql = ''
  if (excludeIds?.length) {
    const excludePlaceholders = excludeIds.map(() => '?').join(', ')
    excludeSql = ` AND (${PRODUCT_CATEGORY_ID_UNSET_SQL} OR p.category_id NOT IN (${excludePlaceholders}))`
    params.push(...excludeIds)
  }

  return queryDb<Record<string, unknown>[]>(
    `SELECT DISTINCT b.*
     FROM products p
     INNER JOIN brands b ON ${brandJoinOn}
     WHERE p.status = 'active'
       AND ${categoryMatch}${excludeSql}
     ORDER BY COALESCE(b.sort_order, 9999), b.name ASC`,
    params
  )
}

/** Brands with at least one active product in the current category/subcategory scope. */
async function listActiveBrandsForShopCategory(
  categoryName: string,
  subcategory?: string
): Promise<Record<string, unknown>[]> {
  const categories = await loadActiveCategories()
  const categoryFilter = resolveShopCategoryFilter(categories, {
    category: categoryName,
    subcategory,
  })
  const filterIds = categoryFilter?.categoryIds ?? []

  if (!filterIds.length || !categoryFilter) {
    return []
  }

  return listActiveBrandsByProductsInCategory(categoryFilter, filterIds)
}

export async function getBrandCategoryIds(brandId: string): Promise<string[]> {
  if (!(await brandCategoriesTableExists())) return []
  const rows = await queryDb<{ category_id: string }[]>(
    'SELECT category_id FROM brand_categories WHERE brand_id = ?',
    [brandId]
  )
  return rows.map((r) => r.category_id)
}

export type BrandCategoryLink = {
  id: string
  name: string
  parent_id?: string | null
  parent_name?: string | null
}

export async function getBrandCategories(brandId: string): Promise<BrandCategoryLink[]> {
  if (!(await brandCategoriesTableExists())) return []
  return queryDb<BrandCategoryLink[]>(
    `SELECT c.id, c.name, c.parent_id, p.name AS parent_name
     FROM brand_categories bc
     INNER JOIN categories c ON c.id = bc.category_id
     LEFT JOIN categories p ON p.id = c.parent_id
     WHERE bc.brand_id = ?
     ORDER BY COALESCE(p.name, c.name), c.name ASC`,
    [brandId]
  )
}

export async function setBrandCategories(brandId: string, categoryIds: string[]) {
  const unique = Array.from(new Set(categoryIds.map((id) => id.trim()).filter(Boolean)))
  if (!(await brandCategoriesTableExists())) {
    if (unique.length) {
      throw new Error(
        'brand_categories table is missing — run db/upgrade.sql or db/brand_categories.sql'
      )
    }
    return
  }
  await queryDb('DELETE FROM brand_categories WHERE brand_id = ?', [brandId])
  for (const categoryId of unique) {
    await queryDb(
      'INSERT INTO brand_categories (brand_id, category_id) VALUES (?, ?)',
      [brandId, categoryId]
    )
  }
}

/** Admin list: all brands with linked categories (single query, not N+1). */
export async function listBrandsWithCategoryLinks() {
  const brands = await listBrands(false)
  if (!(await brandCategoriesTableExists())) {
    return brands.map((b) => ({
      ...b,
      categories: [] as BrandCategoryLink[],
    }))
  }

  const links = await queryDb<
    (BrandCategoryLink & { brand_id: string })[]
  >(
    `SELECT bc.brand_id, c.id, c.name, c.parent_id, p.name AS parent_name
     FROM brand_categories bc
     INNER JOIN categories c ON c.id = bc.category_id
     LEFT JOIN categories p ON p.id = c.parent_id
     ORDER BY COALESCE(p.name, c.name), c.name ASC`
  )

  const byBrand = new Map<string, BrandCategoryLink[]>()
  for (const row of links) {
    const brandId = String(row.brand_id)
    const list = byBrand.get(brandId) ?? []
    list.push({
      id: String(row.id),
      name: String(row.name),
      parent_id: row.parent_id ?? null,
      parent_name: row.parent_name ?? null,
    })
    byBrand.set(brandId, list)
  }

  return brands.map((b) => ({
    ...b,
    categories: byBrand.get(String(b.id)) ?? [],
  }))
}

export async function getBrandById(id: string) {
  const rows = await queryDb<Record<string, unknown>[]>(
    'SELECT * FROM brands WHERE id = ? LIMIT 1',
    [id]
  )
  return rows[0] ?? null
}

export async function insertBrand(input: {
  name: string
  slug: string
  description?: string
  categoryIds?: string[]
}) {
  const id = randomUUID()
  await queryDb(
    'INSERT INTO brands (id, name, slug, description, active) VALUES (?, ?, ?, ?, 1)',
    [id, input.name, input.slug, input.description || null]
  )
  if (input.categoryIds?.length) {
    await setBrandCategories(id, input.categoryIds)
  }
  const rows = await queryDb<Record<string, unknown>[]>(
    'SELECT * FROM brands WHERE id = ? LIMIT 1',
    [id]
  )
  return rows[0]
}

export async function updateBrandById(
  id: string,
  input: {
    name: string
    slug: string
    description?: string
    active?: boolean
    categoryIds?: string[]
  }
) {
  const prev = await getBrandById(id)

  const prevName = prev?.name != null ? String(prev.name).trim() : ''
  const nextName = input.name.trim()
  const nameChanged = Boolean(prevName && nextName && prevName !== nextName)

  await queryDb(
    'UPDATE brands SET name = ?, slug = ?, description = ?, active = ? WHERE id = ?',
    [
      input.name,
      input.slug,
      input.description || null,
      input.active === false ? 0 : 1,
      id,
    ]
  )

  const hasBrandId = await productsHaveBrandIdColumn()
  if (nameChanged) {
    if (hasBrandId) {
      await queryDb(
        `UPDATE products SET brand = ? WHERE brand_id = ?
         AND (
           TRIM(COALESCE(brand, '')) = ''
           OR LOWER(TRIM(brand)) = LOWER(TRIM(?))
         )`,
        [input.name, id, prevName]
      )
    } else {
      await queryDb('UPDATE products SET brand = ? WHERE brand = ?', [input.name, prevName])
    }
  }

  if (input.categoryIds !== undefined) {
    await setBrandCategories(id, input.categoryIds)
  }

  return getBrandById(id)
}

export async function deleteBrandById(id: string) {
  if (await brandCategoriesTableExists()) {
    await queryDb('DELETE FROM brand_categories WHERE brand_id = ?', [id])
  }
  await queryDb('DELETE FROM brands WHERE id = ?', [id])
}

let brandIdColumnCache: boolean | null = null
let brandColumnCache: boolean | null = null
let categoryIdColumnCache: boolean | null = null
let brandsTableCache: boolean | null = null

async function productsColumnExists(column: string): Promise<boolean> {
  const rows = await queryDb<{ COLUMN_NAME: string }[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
       AND COLUMN_NAME = ?`,
    [column]
  )
  return rows.length > 0
}

export async function productsHaveBrandColumn(): Promise<boolean> {
  if (brandColumnCache != null) return brandColumnCache
  try {
    brandColumnCache = await productsColumnExists('brand')
  } catch {
    brandColumnCache = false
  }
  return brandColumnCache
}

export async function productsHaveBrandIdColumn(): Promise<boolean> {
  if (brandIdColumnCache != null) return brandIdColumnCache
  try {
    brandIdColumnCache = await productsColumnExists('brand_id')
  } catch {
    brandIdColumnCache = false
  }
  return brandIdColumnCache
}

async function productsHaveCategoryIdColumn(): Promise<boolean> {
  if (categoryIdColumnCache != null) return categoryIdColumnCache
  try {
    categoryIdColumnCache = await productsColumnExists('category_id')
  } catch {
    categoryIdColumnCache = false
  }
  return categoryIdColumnCache
}

export async function brandsTableExists(): Promise<boolean> {
  if (brandsTableCache != null) return brandsTableCache
  try {
    const rows = await queryDb<{ TABLE_NAME: string }[]>(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'brands'`
    )
    brandsTableCache = rows.length > 0
  } catch {
    brandsTableCache = false
  }
  return brandsTableCache
}

export async function resolveBrandByName(
  brandName: string
): Promise<{ id: string; name: string } | null> {
  const trimmed = brandName.trim()
  if (!trimmed) return null

  const rows = await queryDb<{ id: string; name: string }[]>(
    `SELECT id, name FROM brands
     WHERE active = 1 AND (name = ? OR slug = ?)
     LIMIT 1`,
    [trimmed, slugifyCategory(trimmed)]
  )
  return rows[0] ?? null
}

export async function resolveProductBrandInput(brandName: string | null | undefined) {
  const trimmed = brandName?.trim()
  if (!trimmed) return { name: null as string | null, id: undefined as string | undefined }
  const resolved = await resolveBrandByName(trimmed)
  if (!resolved) throw new UnknownBrandError(trimmed)
  return { name: resolved.name, id: resolved.id }
}
