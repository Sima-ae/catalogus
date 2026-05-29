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
  categories: string[]
}

export function mapDbBrandsToAdminRows(
  dbBrands: Array<
    Record<string, unknown> & {
      categories?: { id: string; name: string }[]
    }
  >
): AdminBrandRow[] {
  return dbBrands
    .map((b) => ({
      id: String(b.id ?? ''),
      name: String(b.name ?? ''),
      slug: String(b.slug ?? ''),
      description: b.description ? String(b.description) : null,
      active: b.active === false || b.active === 0 ? false : true,
      categories: b.categories?.map((c) => c.name) ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function parseCategoryIds(body: Record<string, unknown>): string[] {
  const raw = body.category_ids ?? body.categoryIds
  if (!Array.isArray(raw)) return []
  return Array.from(new Set(raw.map((id) => String(id).trim()).filter(Boolean)))
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

  return { name, slug, description, active, categoryIds: parseCategoryIds(body) }
}
