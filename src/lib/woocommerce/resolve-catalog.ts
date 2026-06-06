import { queryDb } from '@/lib/db'
import { slugifyCategory } from '@/lib/category-slug'
import { insertBrand, resolveBrandByName } from '@/lib/brands-db'
import type { WooProductData } from '@/lib/woocommerce/types'

export type ResolvedImportCatalog = {
  categoryId: string | null
  categoryName: string
  brandId: string | null
  brandName: string | null
}

type CategoryRow = {
  id: string
  name: string
  parent_id: string | null
  parent_name: string | null
}

async function loadActiveCategories(): Promise<CategoryRow[]> {
  return queryDb<CategoryRow[]>(
    `SELECT c.id, c.name, c.parent_id, p.name AS parent_name
     FROM categories c
     LEFT JOIN categories p ON p.id = c.parent_id
     WHERE c.active = 1`
  )
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

function categoryStorageLabel(row: CategoryRow): string {
  if (!row.parent_id || !row.parent_name) return String(row.name).trim()
  return `${String(row.parent_name).trim()} › ${String(row.name).trim()}`
}

function findCategoryByName(rows: CategoryRow[], name: string): CategoryRow | null {
  const key = normalizeName(name)
  if (!key) return null
  const matches = rows.filter((row) => normalizeName(row.name) === key)
  if (!matches.length) return null
  return matches.find((row) => !row.parent_id) ?? matches[0]
}

export async function resolveOrCreateImportBrand(
  brandName: string | null | undefined
): Promise<{ id: string; name: string } | null> {
  const trimmed = String(brandName ?? '').trim()
  if (!trimmed) return null

  const existing = await resolveBrandByName(trimmed)
  if (existing) return existing

  const created = await insertBrand({
    name: trimmed,
    slug: slugifyCategory(trimmed),
  })
  return created
    ? { id: String(created.id), name: String(created.name) }
    : null
}

export async function resolveImportCatalogMapping(
  woo: WooProductData,
  fallback: {
    catalogCategoryId: string | null | undefined
    catalogCategoryName: string | null | undefined
    catalogBrandId: string | null | undefined
    catalogBrandName: string | null | undefined
  }
): Promise<ResolvedImportCatalog> {
  const categories = await loadActiveCategories()

  let categoryRow: CategoryRow | null = null
  if (woo.categoryName) {
    categoryRow = findCategoryByName(categories, woo.categoryName)
  }
  if (!categoryRow && fallback.catalogCategoryId) {
    categoryRow =
      categories.find((row) => String(row.id) === String(fallback.catalogCategoryId)) ?? null
  }

  const categoryName = categoryRow
    ? categoryStorageLabel(categoryRow)
    : String(fallback.catalogCategoryName ?? '').trim() || 'Uncategorized'

  let brandId = fallback.catalogBrandId?.trim() || null
  let brandName = fallback.catalogBrandName?.trim() || null

  if (woo.brandName) {
    const resolved = await resolveOrCreateImportBrand(woo.brandName)
    if (resolved) {
      brandId = resolved.id
      brandName = resolved.name
    }
  } else if (brandId && !brandName) {
    const row = await queryDb<{ name: string }[]>(
      `SELECT name FROM brands WHERE id = ? LIMIT 1`,
      [brandId]
    )
    brandName = row[0]?.name?.trim() || null
  }

  return {
    categoryId: categoryRow?.id ?? fallback.catalogCategoryId?.trim() ?? null,
    categoryName,
    brandId,
    brandName,
  }
}
