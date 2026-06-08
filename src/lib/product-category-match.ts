import type { ShopCategoryFilterResult } from '@/lib/shop-category-tree'

export type ProductCategoryMatchInput = {
  category_id?: string | null
  category?: string | null
}

/** Client-side equivalent of `buildQualifiedCategoryTextMatch` (compound `products.category`). */
export function productCategoryTextMatchesQualifiedLabels(
  categoryText: string | null | undefined,
  labels: string[]
): boolean {
  const raw = categoryText?.trim() ?? ''
  if (!raw) return false
  for (const label of labels) {
    const name = label.trim()
    if (!name) continue
    if (raw === name) return true
    if (raw.startsWith(`${name} / `)) return true
    if (raw.endsWith(` / ${name}`)) return true
    if (raw.includes(` / ${name} / `)) return true
  }
  return false
}

/** Match a product row against a resolved shop category filter (same rules as the catalog SQL). */
export function productMatchesShopCategoryFilter(
  product: ProductCategoryMatchInput,
  filter: ShopCategoryFilterResult | undefined
): boolean {
  if (!filter) return true
  if (!filter.categoryIds.length) return false

  const categoryId = product.category_id?.trim() || null
  const categoryText = product.category?.trim() || null

  if (categoryId && filter.excludeCategoryIds?.includes(categoryId)) {
    return false
  }

  const idMatches = Boolean(categoryId && filter.categoryIds.includes(categoryId))

  if (filter.strictIdOnly) {
    const labels = [
      filter.categoryStorageLabel,
      ...filter.legacyNames,
    ].filter(Boolean) as string[]

    if (categoryId) return idMatches
    return productCategoryTextMatchesQualifiedLabels(categoryText, labels)
  }

  if (idMatches) return true
  if (categoryId) return false

  return productCategoryTextMatchesQualifiedLabels(categoryText, filter.legacyNames)
}
