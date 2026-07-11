import { queryDb } from '@/lib/db'

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

export async function productsHaveCategoryIdColumn(): Promise<boolean> {
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
