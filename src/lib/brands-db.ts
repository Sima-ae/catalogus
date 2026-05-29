import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'
import { slugifyCategory } from '@/lib/category-slug'

export class UnknownBrandError extends Error {
  constructor(name: string) {
    super(`Brand "${name}" does not exist. Add it under Admin → Brands first.`)
    this.name = 'UnknownBrandError'
  }
}

export async function listBrands(activeOnly = false) {
  if (activeOnly) {
    return queryDb<Record<string, unknown>[]>(
      'SELECT * FROM brands WHERE active = 1 ORDER BY COALESCE(sort_order, 9999), name ASC'
    )
  }
  return queryDb<Record<string, unknown>[]>('SELECT * FROM brands ORDER BY name ASC')
}

export async function getBrandById(id: string) {
  const rows = await queryDb<Record<string, unknown>[]>(
    'SELECT * FROM brands WHERE id = ? LIMIT 1',
    [id]
  )
  return rows[0] ?? null
}

export async function insertBrand(input: { name: string; slug: string; description?: string }) {
  const id = randomUUID()
  await queryDb(
    'INSERT INTO brands (id, name, slug, description, active) VALUES (?, ?, ?, ?, 1)',
    [id, input.name, input.slug, input.description || null]
  )
  const rows = await queryDb<Record<string, unknown>[]>(
    'SELECT * FROM brands WHERE id = ? LIMIT 1',
    [id]
  )
  return rows[0]
}

export async function updateBrandById(
  id: string,
  input: { name: string; slug: string; description?: string; active?: boolean }
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

  return getBrandById(id)
}

export async function deleteBrandById(id: string) {
  await queryDb('DELETE FROM brands WHERE id = ?', [id])
}

let brandIdColumnCache: boolean | null = null
let brandColumnCache: boolean | null = null

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

export async function brandsTableExists(): Promise<boolean> {
  try {
    const rows = await queryDb<{ TABLE_NAME: string }[]>(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'brands'`
    )
    return rows.length > 0
  } catch {
    return false
  }
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
