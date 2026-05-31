import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'
import { slugifyCategory } from '@/lib/category-slug'

export type BrandSubcategoryRow = {
  id: string
  brand_id: string
  name: string
  slug: string
  sort_order?: number | null
  active?: number | boolean
}

let tableExistsCache: boolean | null = null

export async function brandSubcategoriesTableExists(): Promise<boolean> {
  if (tableExistsCache != null) return tableExistsCache
  try {
    const rows = await queryDb<{ TABLE_NAME: string }[]>(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'brand_subcategories'`
    )
    tableExistsCache = rows.length > 0
  } catch {
    tableExistsCache = false
  }
  return tableExistsCache
}

export async function listBrandSubcategories(
  brandId: string,
  activeOnly = false
): Promise<BrandSubcategoryRow[]> {
  if (!(await brandSubcategoriesTableExists())) return []
  const sql = activeOnly
    ? `SELECT * FROM brand_subcategories
       WHERE brand_id = ? AND active = 1
       ORDER BY COALESCE(sort_order, 9999), name ASC`
    : `SELECT * FROM brand_subcategories
       WHERE brand_id = ?
       ORDER BY COALESCE(sort_order, 9999), name ASC`
  return queryDb<BrandSubcategoryRow[]>(sql, [brandId])
}

export async function getBrandSubcategoryById(
  brandId: string,
  subcategoryId: string
): Promise<BrandSubcategoryRow | null> {
  if (!(await brandSubcategoriesTableExists())) return null
  const rows = await queryDb<BrandSubcategoryRow[]>(
    `SELECT * FROM brand_subcategories WHERE brand_id = ? AND id = ? LIMIT 1`,
    [brandId, subcategoryId]
  )
  return rows[0] ?? null
}

export async function insertBrandSubcategory(
  brandId: string,
  input: { name: string; slug?: string; sort_order?: number | null; active?: boolean }
): Promise<BrandSubcategoryRow> {
  if (!(await brandSubcategoriesTableExists())) {
    throw new Error('brand_subcategories table missing — run db/brand_subcategories.sql')
  }

  const name = input.name.trim()
  const slug = (input.slug?.trim() || slugifyCategory(name)).toLowerCase()
  const id = randomUUID()

  await queryDb(
    `INSERT INTO brand_subcategories (id, brand_id, name, slug, sort_order, active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      brandId,
      name,
      slug,
      input.sort_order ?? null,
      input.active === false ? 0 : 1,
    ]
  )

  const row = await getBrandSubcategoryById(brandId, id)
  if (!row) throw new Error('Failed to create brand subcategory')
  return row
}

export async function updateBrandSubcategoryById(
  brandId: string,
  subcategoryId: string,
  input: { name: string; slug?: string; sort_order?: number | null; active?: boolean }
): Promise<BrandSubcategoryRow | null> {
  if (!(await brandSubcategoriesTableExists())) return null

  const prev = await getBrandSubcategoryById(brandId, subcategoryId)
  if (!prev) return null

  const name = input.name.trim()
  const slug = (input.slug?.trim() || slugifyCategory(name)).toLowerCase()

  await queryDb(
    `UPDATE brand_subcategories
     SET name = ?, slug = ?, sort_order = ?, active = ?
     WHERE brand_id = ? AND id = ?`,
    [
      name,
      slug,
      input.sort_order ?? null,
      input.active === false ? 0 : 1,
      brandId,
      subcategoryId,
    ]
  )

  return getBrandSubcategoryById(brandId, subcategoryId)
}

export async function deleteBrandSubcategoryById(
  brandId: string,
  subcategoryId: string
): Promise<boolean> {
  if (!(await brandSubcategoriesTableExists())) return false
  const result = await queryDb<{ affectedRows?: number }>(
    `DELETE FROM brand_subcategories WHERE brand_id = ? AND id = ?`,
    [brandId, subcategoryId]
  )
  return (result?.affectedRows ?? 0) > 0
}

export function serializeBrandSubcategory(row: BrandSubcategoryRow) {
  return {
    id: row.id,
    brand_id: row.brand_id,
    name: row.name,
    slug: row.slug,
    sort_order: row.sort_order ?? null,
    active: row.active === false || row.active === 0 ? false : true,
  }
}

export function parseBrandSubcategoryBody(body: Record<string, unknown>) {
  const name = String(body.name || '').trim()
  const slugRaw = body.slug != null ? String(body.slug).trim() : ''
  const slug = slugRaw ? slugifyCategory(slugRaw) : slugifyCategory(name)
  const sortRaw = body.sort_order
  const sort_order =
    sortRaw === null || sortRaw === undefined || sortRaw === ''
      ? null
      : Number(sortRaw)
  const active =
    body.active === false || body.active === 'false' || body.active === 0 ? false : true

  return { name, slug, sort_order: Number.isFinite(sort_order) ? sort_order : null, active }
}
