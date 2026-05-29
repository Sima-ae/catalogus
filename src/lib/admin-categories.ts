import { slugifyCategory } from '@/lib/category-slug'

export type DbCategory = {
  id: string
  name: string
  slug: string
  description?: string | null
  active?: number | boolean
}

export type AdminCategoryRow = {
  id: string
  name: string
  slug: string
  description: string | null
  active: boolean
}

export function mapDbCategoriesToAdminRows(dbCategories: DbCategory[]): AdminCategoryRow[] {
  return dbCategories
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description ? String(c.description) : null,
      active: c.active === false || c.active === 0 ? false : true,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

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

  return { name, slug, description, active }
}
