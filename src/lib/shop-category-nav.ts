import type { CategoryTreeRow } from '@/lib/category-picker'
import type { CategoryRow } from '@/lib/shop-category-menu'
import {
  getDirectChildCategories,
  getDirectChildCategoriesUnderPath,
} from '@/lib/shop-category-tree'
import type { ShopCategoryFilterResult } from '@/lib/shop-category-tree'
import type { ShopSubcategoryOption } from '@/lib/products-db'

export type ShopCategoryNavNode = {
  name: string
  productCount: number
  children: ShopCategoryNavNode[]
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

/** Names that appear as subcategories or nested rows under another root — hide duplicate top-level pills. */
export function collectDescendantCategoryNames(
  rows: CategoryTreeRow[],
  rootName: string
): Set<string> {
  const names = new Set<string>()
  for (const child of getDirectChildCategories(rows, rootName)) {
    names.add(normalizeName(child.name))
    for (const nested of getDirectChildCategoriesUnderPath(rows, rootName, child.name)) {
      names.add(normalizeName(nested.name))
    }
  }
  return names
}

/** Drop top-level rows whose name already appears under another shop root. */
export function filterDuplicateShopMenuRoots(
  rows: CategoryRow[],
  rootNames: string[]
): string[] {
  const byName = new Map(rows.map((row) => [normalizeName(row.name), row]))
  const trueRoots = rootNames.filter((name) => {
    const row = byName.get(normalizeName(name))
    if (!row) return true
    return !row.parent_id || String(row.parent_id).trim() === ''
  })

  const descendantNames = new Set<string>()
  for (const root of trueRoots) {
    for (const name of Array.from(collectDescendantCategoryNames(rows, root))) {
      descendantNames.add(name)
    }
  }

  return rootNames.filter((name) => {
    const key = normalizeName(name)
    const row = byName.get(key)
    const isOrphanTopLevel =
      row && (!row.parent_id || String(row.parent_id).trim() === '')
    if (isOrphanTopLevel && descendantNames.has(key)) return false
    return true
  })
}

function mapSubcategoryNodes(
  rows: CategoryTreeRow[],
  topName: string,
  children: CategoryTreeRow[],
  countFor: (filter: ShopCategoryFilterResult | undefined) => number,
  resolveFilter: (
    input: { category: string; subcategory?: string; nested?: string }
  ) => ShopCategoryFilterResult | undefined
): ShopCategoryNavNode[] {
  return children
    .map((child) => {
      const subFilter = resolveFilter({
        category: topName,
        subcategory: child.name,
      })
      const nestedRows = getDirectChildCategoriesUnderPath(rows, topName, child.name)
      const nestedNodes = nestedRows
        .map((nested) => {
          const nestedFilter = resolveFilter({
            category: topName,
            subcategory: child.name,
            nested: nested.name,
          })
          const productCount = countFor(nestedFilter)
          return productCount > 0
            ? { name: nested.name, productCount, children: [] as ShopCategoryNavNode[] }
            : null
        })
        .filter(Boolean) as ShopCategoryNavNode[]

      const directCount = countFor(subFilter)
      if (directCount <= 0 && nestedNodes.length === 0) return null

      return {
        name: child.name,
        productCount: directCount,
        children: nestedNodes,
      }
    })
    .filter(Boolean) as ShopCategoryNavNode[]
}

/** Hierarchical shop nav: roots → subcategories → nested (no brands). */
export function buildShopCategoryNavTree(
  rows: CategoryRow[],
  rootNames: string[],
  countFor: (filter: ShopCategoryFilterResult | undefined) => number,
  resolveFilter: (
    input: { category: string; subcategory?: string; nested?: string }
  ) => ShopCategoryFilterResult | undefined
): ShopCategoryNavNode[] {
  const filteredRoots = filterDuplicateShopMenuRoots(rows, rootNames)

  return filteredRoots
    .map((rootName) => {
      const rootFilter = resolveFilter({ category: rootName })
      const rootCount = countFor(rootFilter)
      const children = mapSubcategoryNodes(
        rows,
        rootName,
        getDirectChildCategories(rows, rootName),
        countFor,
        resolveFilter
      )

      if (rootCount <= 0 && children.length === 0) return null

      return {
        name: rootName,
        productCount: rootCount,
        children,
      }
    })
    .filter(Boolean) as ShopCategoryNavNode[]
}

export function shopCategoryNavToSubcategoryOptions(
  nodes: ShopCategoryNavNode[]
): ShopSubcategoryOption[] {
  return nodes.map((node) => ({
    id: node.name,
    name: node.name,
    productCount: node.productCount,
  }))
}

function findNavNode(
  tree: ShopCategoryNavNode[],
  name: string
): ShopCategoryNavNode | undefined {
  const key = normalizeName(name)
  return tree.find((node) => normalizeName(node.name) === key)
}

/** Subcategory pills from an already-loaded shop nav tree (no API round-trip). */
export function resolveShopSubcategoriesFromNav(
  tree: ShopCategoryNavNode[],
  categoryName: string
): ShopSubcategoryOption[] {
  const node = findNavNode(tree, categoryName)
  if (!node?.children.length) return []
  return shopCategoryNavToSubcategoryOptions(node.children)
}

/** Nested pills from an already-loaded shop nav tree. */
export function resolveShopNestedSubcategoriesFromNav(
  tree: ShopCategoryNavNode[],
  categoryName: string,
  subcategoryName: string
): ShopSubcategoryOption[] {
  const parent = findNavNode(tree, categoryName)
  const child = parent?.children.find(
    (node) => normalizeName(node.name) === normalizeName(subcategoryName)
  )
  if (!child?.children.length) return []
  return shopCategoryNavToSubcategoryOptions(child.children)
}
