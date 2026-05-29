import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'
import { slugifyCategory } from '@/lib/category-slug'
import { serializeProductRow } from '@/lib/product-serialize'

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
  author: string
  author_icon: string
  sku?: string | null
  download_url?: string | null
  demo_url?: string | null
  documentation_url?: string | null
  version?: string | null
  license_type?: string | null
  status?: string
  featured?: boolean
}

export class UnknownCategoryError extends Error {
  constructor(name: string) {
    super(`Category "${name}" does not exist. Add it under Admin → Categories first.`)
    this.name = 'UnknownCategoryError'
  }
}

let categoryIdColumn: boolean | null = null

async function productsHaveCategoryIdColumn(): Promise<boolean> {
  if (categoryIdColumn !== null) return categoryIdColumn
  try {
    const rows = await queryDb<{ n: number }[]>(
      `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'category_id'`
    )
    categoryIdColumn = Number(rows[0]?.n) > 0
  } catch {
    categoryIdColumn = false
  }
  return categoryIdColumn
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
  const id = randomUUID()
  const hasCategoryId = await productsHaveCategoryIdColumn()

  if (hasCategoryId) {
    await queryDb(
      `INSERT INTO products (
        id, name, description, short_description, price, original_price, image_url,
        gallery_images, category, category_id, tags, author, author_icon, sku, download_url,
        demo_url, documentation_url, version, license_type, status, featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.description,
        input.short_description || null,
        input.price,
        input.original_price ?? null,
        input.image_url,
        jsonCol(input.gallery_images),
        category.name,
        category.id,
        jsonCol(input.tags),
        input.author,
        input.author_icon,
        input.sku || null,
        input.download_url || null,
        input.demo_url || null,
        input.documentation_url || null,
        input.version || null,
        input.license_type || null,
        input.status || 'active',
        input.featured ? 1 : 0,
      ]
    )
  } else {
    await queryDb(
      `INSERT INTO products (
        id, name, description, short_description, price, original_price, image_url,
        gallery_images, category, tags, author, author_icon, sku, download_url,
        demo_url, documentation_url, version, license_type, status, featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.description,
        input.short_description || null,
        input.price,
        input.original_price ?? null,
        input.image_url,
        jsonCol(input.gallery_images),
        category.name,
        jsonCol(input.tags),
        input.author,
        input.author_icon,
        input.sku || null,
        input.download_url || null,
        input.demo_url || null,
        input.documentation_url || null,
        input.version || null,
        input.license_type || null,
        input.status || 'active',
        input.featured ? 1 : 0,
      ]
    )
  }

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

  const map: Record<string, unknown> = {
    name: input.name,
    description: input.description,
    short_description: input.short_description,
    price: input.price,
    original_price: input.original_price,
    image_url: input.image_url,
    gallery_images: input.gallery_images != null ? jsonCol(input.gallery_images) : undefined,
    category: categoryName,
    category_id: categoryId,
    tags: input.tags != null ? jsonCol(input.tags) : undefined,
    author: input.author,
    author_icon: input.author_icon,
    sku: input.sku,
    download_url: input.download_url,
    demo_url: input.demo_url,
    documentation_url: input.documentation_url,
    version: input.version,
    license_type: input.license_type,
    status: input.status,
    featured: input.featured != null ? (input.featured ? 1 : 0) : undefined,
  }

  const hasCategoryId = await productsHaveCategoryIdColumn()
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
