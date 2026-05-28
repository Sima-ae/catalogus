import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'

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

function jsonCol(value: unknown) {
  if (value == null) return null
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

export async function insertProduct(input: ProductInput) {
  const id = randomUUID()
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
      input.category,
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
  const rows = await queryDb<any[]>('SELECT * FROM products WHERE id = ? LIMIT 1', [id])
  return rows[0]
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  const fields: string[] = []
  const values: unknown[] = []

  const map: Record<string, unknown> = {
    name: input.name,
    description: input.description,
    short_description: input.short_description,
    price: input.price,
    original_price: input.original_price,
    image_url: input.image_url,
    gallery_images: input.gallery_images != null ? jsonCol(input.gallery_images) : undefined,
    category: input.category,
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

  for (const [key, val] of Object.entries(map)) {
    if (val !== undefined) {
      fields.push(`${key} = ?`)
      values.push(val)
    }
  }

  if (!fields.length) return null

  values.push(id)
  await queryDb(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values)
  const rows = await queryDb<any[]>('SELECT * FROM products WHERE id = ? LIMIT 1', [id])
  return rows[0] ?? null
}

export async function getProductById(id: string) {
  const rows = await queryDb<any[]>('SELECT * FROM products WHERE id = ? LIMIT 1', [id])
  return rows[0] ?? null
}

export async function deleteProductById(id: string) {
  await queryDb('DELETE FROM products WHERE id = ?', [id])
}

export async function listCategories() {
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
