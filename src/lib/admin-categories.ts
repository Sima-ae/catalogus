import { slugifyCategory } from '@/lib/category-slug'
import {
  buildCategoryPickerOptions,
  formatCategoryDisplayName,
  sortCategoryTreeRows,
  type CategoryTreeRow,
} from '@/lib/category-picker'

export type DbCategory = {
  id: string
  name: string
  slug: string
  description?: string | null
  parent_id?: string | null
  parent_name?: string | null
  active?: number | boolean
}

export type AdminCategoryRow = {
  id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  parent_name: string | null
  active: boolean
}

export function sortCategoriesForAdminList(rows: AdminCategoryRow[]): AdminCategoryRow[] {
  return sortCategoryTreeRows(rows as CategoryTreeRow[]) as AdminCategoryRow[]
}

export function mapDbCategoriesToAdminRows(dbCategories: DbCategory[]): AdminCategoryRow[] {
  const rows = dbCategories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description ? String(c.description) : null,
    parent_id: c.parent_id ? String(c.parent_id) : null,
    parent_name: c.parent_name ? String(c.parent_name) : null,
    active: c.active === false || c.active === 0 ? false : true,
  }))

  return sortCategoriesForAdminList(rows)
}

export { buildCategoryPickerOptions, formatCategoryDisplayName }

export function parseCategoryBody(body: Record<string, unknown>) {
  const name = String(body.name || '').trim()
  const slug = String(body.slug || slugifyCategory(name))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  const description = body.description ? String(body.description).trim() : undefined
  const active =
    body.active === false || body.active === 'false' || body.active === 0 ? false : true
  const parentRaw = body.parent_id ?? body.parentId
  const parent_id =
    parentRaw == null || parentRaw === '' || parentRaw === 'none'
      ? null
      : String(parentRaw).trim()

  return { name, slug, description, active, parent_id }
}
