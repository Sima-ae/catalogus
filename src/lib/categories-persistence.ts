import { isDevDataFallbackEnabled } from '@/lib/dev-seed'
import type { Category } from '@/lib/dev-store'
import {
  deleteDevCategory,
  getDevCategory,
  listDevCategories,
  replaceDevCategories,
  updateDevCategory,
  createDevCategory,
} from '@/lib/dev-store'
import { readCategoriesFile, writeCategoriesFile } from '@/lib/categories-file-store'
import { isDbConnectionError } from '@/lib/db'
import {
  deleteCategoryById,
  getCategoryById,
  insertCategory,
  listCategories,
  updateCategoryById,
} from '@/lib/products-db'

export type CategoryStorage = 'database' | 'file'

function canUseFileFallback(error: unknown): boolean {
  return isDevDataFallbackEnabled() && isDbConnectionError(error)
}

function persistDevCategoriesToFile() {
  writeCategoriesFile(listDevCategories(false))
}

function loadDevCategoriesFromFile() {
  const fromFile = readCategoriesFile()
  if (fromFile.length > 0) {
    replaceDevCategories(fromFile)
  }
}

/** Call once before dev category operations when DB may be offline. */
export function ensureDevCategoriesHydrated() {
  if (!isDevDataFallbackEnabled()) return
  if (listDevCategories(false).length === 0) {
    loadDevCategoriesFromFile()
  }
}

export async function loadAllCategories(): Promise<{
  rows: Category[]
  storage: CategoryStorage
}> {
  try {
    const rows = await listCategories(false)
    return { rows: rows as Category[], storage: 'database' }
  } catch (error) {
    if (!canUseFileFallback(error)) throw error
    ensureDevCategoriesHydrated()
    return { rows: listDevCategories(false), storage: 'file' }
  }
}

export async function loadActiveCategories(): Promise<{
  rows: Category[]
  storage: CategoryStorage
}> {
  try {
    const rows = await listCategories(true)
    return { rows: rows as Category[], storage: 'database' }
  } catch (error) {
    if (!canUseFileFallback(error)) throw error
    ensureDevCategoriesHydrated()
    const active = listDevCategories(true)
    return { rows: active, storage: 'file' }
  }
}

export async function loadCategoryById(id: string): Promise<{
  row: Category | null
  storage: CategoryStorage
}> {
  try {
    const row = await getCategoryById(id)
    if (row) return { row: row as Category, storage: 'database' }
    return { row: null, storage: 'database' }
  } catch (error) {
    if (!canUseFileFallback(error)) throw error
    ensureDevCategoriesHydrated()
    return { row: getDevCategory(id), storage: 'file' }
  }
}

export async function createCategory(input: {
  name: string
  slug: string
  description?: string
}): Promise<{ row: Category; storage: CategoryStorage }> {
  try {
    const row = await insertCategory(input)
    return { row: row as Category, storage: 'database' }
  } catch (error) {
    if (!canUseFileFallback(error)) throw error
    ensureDevCategoriesHydrated()
    const row = createDevCategory(input)
    persistDevCategoriesToFile()
    return { row, storage: 'file' }
  }
}

export async function saveCategory(
  id: string,
  input: { name: string; slug: string; description?: string; active?: boolean }
): Promise<
  | { ok: true; row: Category; storage: CategoryStorage }
  | { ok: false; status: number; error: string }
> {
  try {
    const row = await updateCategoryById(id, input)
    if (!row) {
      return { ok: false, status: 404, error: 'Category not found in database' }
    }
    return { ok: true, row: row as Category, storage: 'database' }
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code === 'ER_DUP_ENTRY') {
      return { ok: false, status: 409, error: 'A category with this slug already exists' }
    }
    if (!canUseFileFallback(error)) {
      console.error('Category save error:', error)
      return { ok: false, status: 500, error: 'Failed to save category' }
    }
    ensureDevCategoriesHydrated()
    const row = updateDevCategory(id, input)
    if (!row) {
      return { ok: false, status: 404, error: 'Category not found' }
    }
    persistDevCategoriesToFile()
    return { ok: true, row, storage: 'file' }
  }
}

export async function removeCategory(
  id: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  try {
    const existing = await getCategoryById(id)
    if (!existing) {
      return { ok: false, status: 404, error: 'Category not found' }
    }
    await deleteCategoryById(id)
    return { ok: true }
  } catch (error) {
    if (!canUseFileFallback(error)) {
      console.error('Category delete error:', error)
      return { ok: false, status: 500, error: 'Failed to delete category' }
    }
    ensureDevCategoriesHydrated()
    const removed = deleteDevCategory(id)
    if (!removed) {
      return { ok: false, status: 404, error: 'Category not found' }
    }
    persistDevCategoriesToFile()
    return { ok: true }
  }
}
