import type { CategoryTreeRow } from '@/lib/category-picker'
import { appPath } from '@/lib/paths'
import { findParentCategoryName } from '@/lib/shop-category-tree'

export type ShopCategoryFilterLink = {
  category: string
  subcategory?: string
}

/** Parse stored labels like `MIXED › BAGS` from legacy category params. */
export function parseCompoundCategoryParam(value: string): ShopCategoryFilterLink | null {
  const raw = value.trim()
  if (!raw || !raw.includes('›')) return null
  const parts = raw.split('›').map((segment) => segment.trim()).filter(Boolean)
  if (parts.length < 2) return null
  return {
    category: parts[0]!,
    subcategory: parts[parts.length - 1]!,
  }
}

/** Resolve a product row to shop catalog ?category= / ?subcategory= params. */
export function resolveShopCategoryFilterLink(
  rows: CategoryTreeRow[],
  input: { categoryId?: string | null; categoryName?: string | null }
): ShopCategoryFilterLink | null {
  const categoryId = input.categoryId?.trim() || null
  const categoryName = input.categoryName?.trim() || null

  if (categoryId && rows.length) {
    const cat = rows.find((row) => String(row.id) === categoryId)
    if (cat) {
      if (cat.parent_id) {
        const parent = rows.find((row) => row.id === cat.parent_id)
        if (parent?.name) {
          return {
            category: String(parent.name).trim(),
            subcategory: String(cat.name).trim(),
          }
        }
      }
      return { category: String(cat.name).trim() }
    }
  }

  if (categoryName) {
    const compound = parseCompoundCategoryParam(categoryName)
    if (compound) return compound

    if (rows.length) {
      const parent = findParentCategoryName(rows, categoryName)
      if (parent) return { category: parent, subcategory: categoryName }
    }

    return { category: categoryName }
  }

  return null
}

export function shopCategoryFilterUrl(
  rows: CategoryTreeRow[],
  input: { categoryId?: string | null; categoryName?: string | null },
  basePath: string = appPath('/')
): string {
  const link = resolveShopCategoryFilterLink(rows, input)
  if (!link) return basePath
  const params = new URLSearchParams()
  params.set('category', link.category)
  if (link.subcategory) params.set('subcategory', link.subcategory)
  return `${basePath}?${params.toString()}`
}

export function shopBrandFilterUrl(brandName: string, basePath: string = appPath('/')): string {
  const name = brandName.trim()
  if (!name) return basePath
  const params = new URLSearchParams()
  params.set('brand', name)
  return `${basePath}?${params.toString()}`
}
