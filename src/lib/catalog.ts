import type { Product } from '@/lib/types'

export type CatalogMode = 'all' | 'new' | 'popular'

export function filterActiveProducts(products: Product[]): Product[] {
  return products.filter((p) => p.status !== 'inactive' && p.status !== 'draft')
}

export function sortProducts(products: Product[], mode: CatalogMode): Product[] {
  const list = filterActiveProducts(products)

  if (mode === 'new') {
    return [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  if (mode === 'popular') {
    return [...list].sort((a, b) => popularityScore(b) - popularityScore(a))
  }

  return list
}

function popularityScore(product: Product): number {
  const downloads = product.download_count ?? 0
  const reviews = product.review_count ?? 0
  const rating = product.rating ?? 0
  const featured = product.featured ? 50 : 0
  return downloads * 3 + reviews * 2 + rating * 15 + featured
}

export function filterByCategory(products: Product[], category: string): Product[] {
  if (category === 'All') return products
  return products.filter((p) => p.category === category)
}

export function filterBySearch(products: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase()
  if (!q) return products
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
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
