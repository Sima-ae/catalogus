import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'
import { slugifyCategory } from '@/lib/category-slug'
import { serializeProductRow } from '@/lib/product-serialize'
import {
  DuplicateSkuError,
  MissingSkuError,
  normalizeProductSku,
  requireProductSku,
} from '@/lib/product-sku'

export type ProductInput = {
  name: string
  description: string
  short_description?: string
  price: number
  original_price?: number | null
  image_url: string
  gallery_images?: string[] | null
  category: string
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
}

export class UnknownCategoryError extends Error {
  constructor(name: string) {
    super(`Category "${name}" does not exist. Add it under Admin → Categories first.`)
    this.name = 'UnknownCategoryError'
  }
}

export { DuplicateSkuError, MissingSkuError } from '@/lib/product-sku'

async function assertSkuIsUnique(sku: string, excludeProductId?: string) {
  const normalized = normalizeProductSku(sku)
  if (!normalized) throw new MissingSkuError()

  const params: unknown[] = [normalized]
  let sql = `SELECT id FROM products
    WHERE sku IS NOT NULL AND LOWER(TRIM(sku)) = LOWER(?)
    LIMIT 1`

  if (excludeProductId) {
    sql = `SELECT id FROM products
      WHERE sku IS NOT NULL AND LOWER(TRIM(sku)) = LOWER(?) AND id <> ?
      LIMIT 1`
    params.push(excludeProductId)
  }

  const rows = await queryDb<{ id: string }[]>(sql, params)
  if (rows[0]) {
    throw new DuplicateSkuError(normalized)
  }
}

type ProductSchemaFlags = {
  categoryId: boolean
  authorId: boolean
  compatibility: boolean
  support_url: boolean
}

const SCHEMA_CACHE_KEY = '__catalogusProductSchema'

type GlobalSchema = typeof globalThis & { [SCHEMA_CACHE_KEY]?: ProductSchemaFlags }

async function getProductSchemaFlags(): Promise<ProductSchemaFlags> {
  const g = globalThis as GlobalSchema
  if (g[SCHEMA_CACHE_KEY]) return g[SCHEMA_CACHE_KEY]

  try {
    const rows = await queryDb<{ COLUMN_NAME: string }[]>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
         AND COLUMN_NAME IN ('category_id', 'author_id', 'compatibility', 'support_url')`
    )
    const names = new Set(rows.map((r) => r.COLUMN_NAME))
    g[SCHEMA_CACHE_KEY] = {
      categoryId: names.has('category_id'),
      authorId: names.has('author_id'),
      compatibility: names.has('compatibility'),
      support_url: names.has('support_url'),
    }
  } catch {
    g[SCHEMA_CACHE_KEY] = {
      categoryId: false,
      authorId: false,
      compatibility: false,
      support_url: false,
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
  const hasCategoryId = await productsHaveCategoryIdColumn()
  const join = hasCategoryId
    ? `LEFT JOIN categories c ON c.active = 1 AND (
         (p.category_id IS NOT NULL AND c.id = p.category_id)
         OR (c.name = p.category)
       )`
    : `LEFT JOIN categories c ON c.active = 1 AND c.name = p.category`

  return `
    SELECT
      p.*,
      c.id AS resolved_category_id,
      c.name AS resolved_category_name,
      c.slug AS resolved_category_slug
    FROM products p
    ${join}
  `
}

/** Resolve category label to a row in the categories table (required for products). */
export async function resolveCategoryByName(
  categoryName: string
): Promise<{ id: string; name: string } | null> {
  const trimmed = categoryName.trim()
  if (!trimmed) return null

  const rows = await queryDb<{ id: string; name: string }[]>(
    `SELECT id, name FROM categories
     WHERE active = 1 AND (name = ? OR slug = ?)
     LIMIT 1`,
    [trimmed, slugifyCategory(trimmed)]
  )
  return rows[0] ?? null
}

async function resolveProductCategoryInput(categoryName: string) {
  const resolved = await resolveCategoryByName(categoryName)
  if (!resolved) throw new UnknownCategoryError(categoryName.trim())
  return resolved
}

async function fetchProductRow(id: string) {
  const select = await productSelectSql()
  const rows = await queryDb<Record<string, unknown>[]>(
    `${select} WHERE p.id = ? LIMIT 1`,
    [id]
  )
  return rows[0] ? serializeProductRow(rows[0]) : null
}

export async function insertProduct(input: ProductInput) {
  const category = await resolveProductCategoryInput(input.category)
  const sku = requireProductSku(input.sku)
  await assertSkuIsUnique(sku)

  const id = randomUUID()
  const schema = await getProductSchemaFlags()
  const hasCategoryId = schema.categoryId
  const contentCols = await productsContentColumns()

  const insertMap: Record<string, unknown> = {
    id,
    name: input.name,
    description: input.description,
    short_description: input.short_description || null,
    price: input.price,
    original_price: input.original_price ?? null,
    image_url: input.image_url,
    gallery_images: jsonCol(input.gallery_images),
    category: category.name,
    ...(hasCategoryId ? { category_id: category.id } : {}),
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
  }

  const columns = Object.keys(insertMap)
  const placeholders = columns.map(() => '?').join(', ')
  await queryDb(
    `INSERT INTO products (${columns.map((c) => `\`${c}\``).join(', ')}) VALUES (${placeholders})`,
    columns.map((c) => insertMap[c])
  )

  return fetchProductRow(id)
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  const fields: string[] = []
  const values: unknown[] = []

  let categoryId: string | undefined
  let categoryName: string | undefined

  if (input.category !== undefined) {
    const resolved = await resolveProductCategoryInput(input.category)
    categoryName = resolved.name
    categoryId = resolved.id
  }

  const schema = await getProductSchemaFlags()
  const contentCols = await productsContentColumns()
  const hasCategoryId = schema.categoryId

  const map: Record<string, unknown> = {
    name: input.name,
    description: input.description,
    short_description: input.short_description,
    price: input.price,
    original_price: input.original_price,
    image_url: input.image_url,
    gallery_images: input.gallery_images !== undefined ? jsonCol(input.gallery_images) : undefined,
    category: categoryName,
    category_id: categoryId,
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
    sku: input.sku !== undefined ? normalizeProductSku(input.sku) : undefined,
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
  }

  if (!hasCategoryId) {
    delete map.category_id
  }

  for (const [key, val] of Object.entries(map)) {
    if (val !== undefined) {
      fields.push(`${key} = ?`)
      values.push(val)
    }
  }

  if (!fields.length) return fetchProductRow(id)

  if (input.sku !== undefined) {
    const sku = requireProductSku(input.sku)
    await assertSkuIsUnique(sku, id)
    const skuIdx = fields.findIndex((f) => f.startsWith('sku = '))
    if (skuIdx !== -1) {
      values[skuIdx] = sku
    }
  }

  values.push(id)
  await queryDb(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values)
  return fetchProductRow(id)
}

export async function listProducts() {
  const select = await productSelectSql()
  const rows = await queryDb<Record<string, unknown>[]>(
    `${select} ORDER BY p.created_at DESC`
  )
  return rows.map(serializeProductRow)
}

/** Products owned by a seller (author_id or legacy author name match). */
export async function listProductsForSeller(sellerId: string, sellerName: string) {
  const select = await productSelectSql()
  const schema = await getProductSchemaFlags()
  const name = sellerName.trim()

  if (schema.authorId) {
    const rows = await queryDb<Record<string, unknown>[]>(
      `${select}
       WHERE p.author_id = ?
          OR (p.author_id IS NULL AND LOWER(TRIM(p.author)) = LOWER(TRIM(?)))
       ORDER BY p.created_at DESC`,
      [sellerId, name]
    )
    return rows.map(serializeProductRow)
  }

  const rows = await queryDb<Record<string, unknown>[]>(
    `${select} WHERE LOWER(TRIM(p.author)) = LOWER(TRIM(?)) ORDER BY p.created_at DESC`,
    [name]
  )
  return rows.map(serializeProductRow)
}

export async function getProductById(id: string) {
  return fetchProductRow(id)
}

export async function deleteProductById(id: string) {
  await queryDb('DELETE FROM products WHERE id = ?', [id])
}

export async function listCategories(activeOnly = false) {
  if (activeOnly) {
    return queryDb<any[]>(
      'SELECT * FROM categories WHERE active = 1 ORDER BY COALESCE(sort_order, 9999), name ASC'
    )
  }
  return queryDb<any[]>('SELECT * FROM categories ORDER BY name ASC')
}

export async function insertCategory(input: { name: string; slug: string; description?: string }) {
  const id = randomUUID()
  await queryDb(
    'INSERT INTO categories (id, name, slug, description, active) VALUES (?, ?, ?, ?, 1)',
    [id, input.name, input.slug, input.description || null]
  )
  const rows = await queryDb<any[]>('SELECT * FROM categories WHERE id = ? LIMIT 1', [id])
  return rows[0]
}

export async function getCategoryById(id: string) {
  const rows = await queryDb<any[]>('SELECT * FROM categories WHERE id = ? LIMIT 1', [id])
  return rows[0] ?? null
}

export async function updateCategoryById(
  id: string,
  input: { name: string; slug: string; description?: string; active?: boolean }
) {
  const prev = await getCategoryById(id)

  await queryDb(
    'UPDATE categories SET name = ?, slug = ?, description = ?, active = ? WHERE id = ?',
    [
      input.name,
      input.slug,
      input.description || null,
      input.active === false ? 0 : 1,
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
