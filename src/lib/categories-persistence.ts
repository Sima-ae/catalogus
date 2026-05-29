import type { CategoryRecord } from '@/lib/category-types'
import {
  deleteCategoryById,
  getCategoryById,
  insertCategory,
  listCategories,
  updateCategoryById,
} from '@/lib/products-db'

/** All category reads/writes use the `categories` table only. */
export async function loadAllCategories(): Promise<CategoryRecord[]> {
  return (await listCategories(false)) as CategoryRecord[]
}

export async function loadActiveCategories(): Promise<CategoryRecord[]> {
  return (await listCategories(true)) as CategoryRecord[]
}

export async function loadCategoryById(id: string): Promise<CategoryRecord | null> {
  const row = await getCategoryById(id)
  return (row as CategoryRecord | null) ?? null
}

export async function createCategory(input: {
  name: string
  slug: string
  description?: string
}): Promise<CategoryRecord> {
  return (await insertCategory(input)) as CategoryRecord
}

export async function saveCategory(
  id: string,
  input: { name: string; slug: string; description?: string; active?: boolean }
): Promise<
  | { ok: true; row: CategoryRecord }
  | { ok: false; status: number; error: string }
> {
  try {
    const row = await updateCategoryById(id, input)
    if (!row) {
      return { ok: false, status: 404, error: 'Category not found in database' }
    }
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
  return { ok: true }
}
