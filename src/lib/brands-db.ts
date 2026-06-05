import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'
import { slugifyCategory } from '@/lib/category-slug'
import { loadActiveCategories } from '@/lib/categories-persistence'
import { buildLegacyCategoryTextMatch } from '@/lib/catalog-products'
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

  const hasBrandId = await productsHaveBrandIdColumn()
  const hasCategoryId = await productsHaveCategoryIdColumn()
  const idPlaceholders = filterIds.map(() => '?').join(', ')

  const brandMatch = hasBrandId
    ? `(p.brand_id = b.id OR (p.brand_id IS NULL AND LOWER(TRIM(p.brand)) = LOWER(TRIM(b.name))))`
    : `LOWER(TRIM(p.brand)) = LOWER(TRIM(b.name))`

  let categoryMatch = `p.category_id IN (${idPlaceholders})`
  const params: unknown[] = [...filterIds]

  if (hasCategoryId) {
    if (!categoryFilter.strictIdOnly && categoryFilter.legacyNames.length) {
      const legacyNames = categoryFilter.legacyNames.filter(Boolean)
      if (legacyNames.length) {
        const legacy = buildLegacyCategoryTextMatch(legacyNames)
        categoryMatch = `(${categoryMatch} OR (p.category_id IS NULL AND ${legacy.sql}))`
        params.push(...legacy.params)
      }
    }
  } else if (categoryFilter.legacyNames.length) {
    const legacyNames = categoryFilter.legacyNames.filter(Boolean)
    const legacy = buildLegacyCategoryTextMatch(legacyNames)
    categoryMatch = legacy.sql
    params.length = 0
    params.push(...legacy.params)
  }

  return queryDb<Record<string, unknown>[]>(
    `SELECT DISTINCT b.*
     FROM brands b
     WHERE b.active = 1
       AND EXISTS (
         SELECT 1 FROM products p
         WHERE p.status = 'active'
           AND ${brandMatch}
           AND ${categoryMatch}
       )
     ORDER BY COALESCE(b.sort_order, 9999), b.name ASC`,
    params
  )
}

export async function getBrandCategoryIds(brandId: string): Promise<string[]> {
  if (!(await brandCategoriesTableExists())) return []
  const rows = await queryDb<{ category_id: string }[]>(
    'SELECT category_id FROM brand_categories WHERE brand_id = ?',
    [brandId]
  )
  return rows.map((r) => r.category_id)
}

export async function getBrandCategories(brandId: string) {
  if (!(await brandCategoriesTableExists())) return []
  return queryDb<{ id: string; name: string }[]>(
    `SELECT c.id, c.name
     FROM brand_categories bc
     INNER JOIN categories c ON c.id = bc.category_id
     WHERE bc.brand_id = ?
     ORDER BY c.name ASC`,
    [brandId]
  )
}

export async function setBrandCategories(brandId: string, categoryIds: string[]) {
  if (!(await brandCategoriesTableExists())) return
  const unique = Array.from(new Set(categoryIds.map((id) => id.trim()).filter(Boolean)))
  await queryDb('DELETE FROM brand_categories WHERE brand_id = ?', [brandId])
  for (const categoryId of unique) {
    await queryDb(
      'INSERT INTO brand_categories (brand_id, category_id) VALUES (?, ?)',
      [brandId, categoryId]
    )
  }
}

/** Admin list: all brands with linked category names. */
export async function listBrandsWithCategoryLinks() {
  const brands = await listBrands(false)
  if (!(await brandCategoriesTableExists())) {
    return brands.map((b) => ({
      ...b,
      categories: [] as { id: string; name: string }[],
    }))
  }
  const withCats = await Promise.all(
    brands.map(async (b) => ({
      ...b,
      categories: await getBrandCategories(String(b.id)),
    }))
  )
  return withCats
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
  if (hasBrandId && prev?.name) {
    await queryDb('UPDATE products SET brand = ? WHERE brand_id = ?', [input.name, id])
  } else if (prev?.name) {
    await queryDb('UPDATE products SET brand = ? WHERE brand = ?', [input.name, prev.name])
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
