import type { CategoryTreeRow } from '@/lib/category-picker'

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

function isActiveRow(row: CategoryTreeRow): boolean {
  const active = (row as { active?: boolean | number }).active
  return active !== false && active !== 0
}

/** Find a category row by display name (case-insensitive). */
export function findCategoryByName(
  rows: CategoryTreeRow[],
  name: string
): CategoryTreeRow | undefined {
  const key = normalizeName(name)
  return rows.find((row) => normalizeName(row.name) === key)
}

/** Direct children of a parent category (by name). */
export function getDirectChildCategories(
  rows: CategoryTreeRow[],
  parentName: string
): CategoryTreeRow[] {
  const parent = findCategoryByName(rows, parentName)
  if (!parent) return []
  return rows
    .filter((row) => row.parent_id === parent.id && isActiveRow(row))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

export function categoryHasChildren(rows: CategoryTreeRow[], name: string): boolean {
  return getDirectChildCategories(rows, name).length > 0
}

/** Parent category name plus all descendant category names. */
export function getCategoryAndDescendantNames(
  rows: CategoryTreeRow[],
  name: string
): string[] {
  const cat = findCategoryByName(rows, name)
  if (!cat) return [name]

  const names: string[] = [cat.name]
  const walk = (parentId: string) => {
    for (const row of rows) {
      if (row.parent_id === parentId && isActiveRow(row)) {
        names.push(row.name)
        walk(row.id)
      }
    }
  }
  walk(cat.id)
  return names
}

export type ShopCategoryFilterInput = {
  category?: string
  subcategory?: string
}

/** Resolve which category names a shop filter should match. */
export function resolveShopCategoryFilterNames(
  rows: CategoryTreeRow[],
  input: ShopCategoryFilterInput
): string[] | undefined {
  const category = input.category?.trim()
  if (!category || category === 'All') return undefined

  const subcategory = input.subcategory?.trim()
  if (subcategory && subcategory !== 'All') {
    return [subcategory]
  }

  return getCategoryAndDescendantNames(rows, category)
}
