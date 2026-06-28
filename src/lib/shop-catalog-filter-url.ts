import type { CategoryTreeRow } from '@/lib/category-picker'
import { appPath } from '@/lib/paths'
import { buildCategoryAncestorChain, findCategoryShopPath } from '@/lib/shop-category-tree'

export type ShopCategoryFilterLink = {
  category: string
  subcategory?: string
  nested?: string
}

/** Parse stored labels like `MIXED › BAGS` from legacy category params. */
export function parseCompoundCategoryParam(value: string): ShopCategoryFilterLink | null {
  const raw = value.trim()
  if (!raw || !raw.includes('›')) return null
  const parts = raw.split('›').map((segment) => segment.trim()).filter(Boolean)
  if (parts.length < 2) return null
  if (parts.length === 2) {
    return {
      category: parts[0]!,
      subcategory: parts[1]!,
    }
  }
  return {
    category: parts[0]!,
    subcategory: parts[1]!,
    nested: parts[parts.length - 1]!,
  }
}

/** Resolve a product row to shop catalog ?category= / ?subcategory= / ?nested= params. */
export function resolveShopCategoryFilterLink(
  rows: CategoryTreeRow[],
  input: { categoryId?: string | null; categoryName?: string | null }
): ShopCategoryFilterLink | null {
  const categoryId = input.categoryId?.trim() || null
  const categoryName = input.categoryName?.trim() || null

  if (categoryId && rows.length) {
    const cat = rows.find((row) => String(row.id) === categoryId)
    if (cat) {
      const chain = buildCategoryAncestorChain(rows, cat)
      const top = chain[0]
      if (!top) return null
      if (chain.length === 1) return { category: String(top.name).trim() }
      if (chain.length === 2) {
        return {
          category: String(top.name).trim(),
          subcategory: String(chain[1]!.name).trim(),
        }
      }
      return {
        category: String(top.name).trim(),
        subcategory: String(chain[1]!.name).trim(),
        nested: String(chain[chain.length - 1]!.name).trim(),
      }
    }
  }

  if (categoryName) {
    const compound = parseCompoundCategoryParam(categoryName)
    if (compound) return compound

    if (rows.length) {
      const path = findCategoryShopPath(rows, categoryName)
      if (path) return path
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
  if (link.nested) params.set('nested', link.nested)
  return `${basePath}?${params.toString()}`
}

export function shopBrandFilterUrl(brandName: string, basePath: string = appPath('/')): string {
  const name = brandName.trim()
  if (!name) return basePath
  const params = new URLSearchParams()
  params.set('brand', name)
  return `${basePath}?${params.toString()}`
}

export function buildShopCategoryFilterHref(
  basePath: string,
  link: ShopCategoryFilterLink
): string {
  const params = new URLSearchParams()
  params.set('category', link.category)
  if (link.subcategory) params.set('subcategory', link.subcategory)
  if (link.nested) params.set('nested', link.nested)
  return `${basePath}?${params.toString()}`
}
