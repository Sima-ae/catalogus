import { slugifyCategory } from '@/lib/category-slug'

export type DbBrand = {
  id: string
  name: string
  slug: string
  description?: string | null
  active?: number | boolean
}

export type AdminBrandRow = {
  id: string
  name: string
  slug: string
  description: string | null
  active: boolean
}

export function mapDbBrandsToAdminRows(dbBrands: DbBrand[]): AdminBrandRow[] {
  return dbBrands
    .map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description ? String(b.description) : null,
      active: b.active === false || b.active === 0 ? false : true,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function parseBrandBody(body: Record<string, unknown>) {
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
