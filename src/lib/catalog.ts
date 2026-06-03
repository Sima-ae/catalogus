import type { Product } from '@/lib/types'

export type CatalogMode = 'all' | 'new'

export function filterActiveProducts(products: Product[]): Product[] {
  return products.filter(
    (p) => p.status !== 'inactive' && p.status !== 'draft' && p.status !== 'trash'
  )
}

/**
 * Catalog week in local time: Sunday 00:00 through the following Sunday 00:00 (exclusive).
 */
export function getCatalogWeekRange(now = new Date()): { start: Date; end: Date } {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(today.getDate() - today.getDay())
  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  return { start, end }
}

export function isProductInCurrentCatalogWeek(
  createdAt: string | Date,
  now = new Date()
): boolean {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
  if (!Number.isFinite(created.getTime())) return false
  const { start, end } = getCatalogWeekRange(now)
  return created >= start && created < end
}

export function sortProducts(products: Product[], mode: CatalogMode): Product[] {
  const list = filterActiveProducts(products)

  if (mode === 'new') {
    return list
      .filter((p) => isProductInCurrentCatalogWeek(p.created_at))
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
  }

  return list
}

export function sortByNewestFirst(products: Product[]): Product[] {
  return [...products].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export function filterByCategory(products: Product[], category: string): Product[] {
  if (category === 'All') return sortByNewestFirst(products)
  return products.filter((p) => p.category === category)
}

export function filterByBrand(products: Product[], brand: string): Product[] {
  if (brand === 'All') return products
  return products.filter((p) => (p.brand || '') === brand)
}

export function filterBySearch(products: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase()
  if (!q) return products
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.tags && p.tags.some((t) => String(t).toLowerCase().includes(q)))
  )
}

export function productsAddedThisMonth(products: Product[]): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return filterActiveProducts(products).filter(
    (p) => new Date(p.created_at) >= start
  ).length
}
