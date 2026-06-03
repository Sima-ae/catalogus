import type { CategoryRecord } from '@/lib/category-types'
import {
  deleteCategoryById,
  getCategoryById,
  insertCategory,
  listCategories,
  updateCategoryById,
} from '@/lib/products-db'
import { getCachedValue, invalidateCachedNamespace } from '@/lib/server-ttl-cache'

const ACTIVE_CATEGORIES_CACHE_NS = 'active-categories'
const ACTIVE_CATEGORIES_TTL_MS = 60_000

/** All category reads/writes use the `categories` table only. */
export async function loadAllCategories(): Promise<CategoryRecord[]> {
  return (await listCategories(false)) as CategoryRecord[]
}

export async function loadActiveCategories(): Promise<CategoryRecord[]> {
  return getCachedValue(ACTIVE_CATEGORIES_CACHE_NS, 'all', ACTIVE_CATEGORIES_TTL_MS, async () =>
    (await listCategories(true)) as CategoryRecord[]
  )
}

export function invalidateActiveCategoriesCache(): void {
  invalidateCachedNamespace(ACTIVE_CATEGORIES_CACHE_NS)
}

export async function loadCategoryById(id: string): Promise<CategoryRecord | null> {
  const row = await getCategoryById(id)
  return (row as CategoryRecord | null) ?? null
}

export async function createCategory(input: {
  name: string
  slug: string
  description?: string
  parent_id?: string | null
}): Promise<CategoryRecord> {
  const row = (await insertCategory(input)) as CategoryRecord
  invalidateActiveCategoriesCache()
  return row
}

export async function saveCategory(
  id: string,
  input: {
    name: string
    slug: string
    description?: string
    active?: boolean
    parent_id?: string | null
  }
): Promise<
  | { ok: true; row: CategoryRecord }
  | { ok: false; status: number; error: string }
> {
  try {
    const row = await updateCategoryById(id, input)
    if (!row) {
      return { ok: false, status: 404, error: 'Category not found in database' }
    }
    invalidateActiveCategoriesCache()
    return { ok: true, row: row as CategoryRecord }
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code === 'ER_DUP_ENTRY') {
      return { ok: false, status: 409, error: 'A category with this slug already exists' }
    }
    throw error
  }
}

export async function removeCategory(
  id: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const existing = await getCategoryById(id)
  if (!existing) {
    return { ok: false, status: 404, error: 'Category not found' }
  }
  await deleteCategoryById(id)
  invalidateActiveCategoriesCache()
  return { ok: true }
}
