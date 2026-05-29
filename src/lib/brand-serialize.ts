import { getBrandCategories } from '@/lib/brands-db'

type CategoryLink = { id: string; name: string }

/** Plain JSON-safe brand row for API responses. */
export function serializeBrand(
  row: Record<string, unknown>,
  categories: CategoryLink[] = []
) {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    slug: String(row.slug ?? ''),
    description:
      row.description != null && row.description !== ''
        ? String(row.description)
        : null,
    active: row.active === false || row.active === 0 ? false : true,
    categories,
    category_ids: categories.map((c) => c.id),
  }
}

export async function serializeBrandWithCategories(row: Record<string, unknown>) {
  const id = String(row.id ?? '')
  const categories = id ? await getBrandCategories(id) : []
  return serializeBrand(row, categories)
}
