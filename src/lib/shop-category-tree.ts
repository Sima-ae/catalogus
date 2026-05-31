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
  name: string,
  options?: { parentId?: string | null; topLevelOnly?: boolean }
): CategoryTreeRow | undefined {
  const key = normalizeName(name)
  const matches = rows.filter(
    (row) => normalizeName(row.name) === key && isActiveRow(row)
  )
  if (!matches.length) return undefined

  if (options?.parentId !== undefined) {
    return matches.find((row) => row.parent_id === options.parentId)
  }
  if (options?.topLevelOnly) {
    return matches.find((row) => !row.parent_id)
  }
  return matches.find((row) => !row.parent_id) ?? matches[0]
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

function getCategoryAndDescendantIds(
  rows: CategoryTreeRow[],
  cat: CategoryTreeRow
): { ids: string[]; names: string[] } {
  const ids: string[] = [cat.id]
  const names: string[] = [cat.name]
  const walk = (parentId: string) => {
    for (const row of rows) {
      if (row.parent_id === parentId && isActiveRow(row)) {
        ids.push(row.id)
        names.push(row.name)
        walk(row.id)
      }
    }
  }
  walk(cat.id)
  return { ids, names }
}

export type ShopCategoryFilterInput = {
  category?: string
  subcategory?: string
}

export type ShopCategoryFilterResult = {
  categoryIds: string[]
  /** For legacy rows without category_id — only used when strictIdOnly is false. */
  legacyNames: string[]
  /** When true, match category_id only (e.g. SOCCER › SHOES vs top-level SHOES). */
  strictIdOnly: boolean
}

/** Resolve which categories a shop filter should match (by id, not ambiguous name). */
export function resolveShopCategoryFilter(
  rows: CategoryTreeRow[],
  input: ShopCategoryFilterInput
): ShopCategoryFilterResult | undefined {
  const category = input.category?.trim()
  if (!category || category === 'All') return undefined

  const subcategory = input.subcategory?.trim()

  if (subcategory && subcategory !== 'All') {
    const parent = findCategoryByName(rows, category)
    if (!parent) return { categoryIds: [], legacyNames: [], strictIdOnly: true }

    const child = rows.find(
      (row) =>
        row.parent_id === parent.id &&
        normalizeName(row.name) === normalizeName(subcategory) &&
        isActiveRow(row)
    )
    if (!child) return { categoryIds: [], legacyNames: [], strictIdOnly: true }
    return { categoryIds: [child.id], legacyNames: [], strictIdOnly: true }
  }

  const anchor =
    findCategoryByName(rows, category, { topLevelOnly: true }) ??
    findCategoryByName(rows, category)
  if (!anchor) return undefined

  const { ids, names } = getCategoryAndDescendantIds(rows, anchor)
  return { categoryIds: ids, legacyNames: names, strictIdOnly: false }
}

/** @deprecated Use resolveShopCategoryFilter — kept for callers that only need names. */
export function resolveShopCategoryFilterNames(
  rows: CategoryTreeRow[],
  input: ShopCategoryFilterInput
): string[] | undefined {
  const result = resolveShopCategoryFilter(rows, input)
  if (!result?.categoryIds.length) return undefined
  return result.legacyNames.length ? result.legacyNames : undefined
}

export function getCategoryAndDescendantNames(
  rows: CategoryTreeRow[],
  name: string
): string[] {
  const cat =
    findCategoryByName(rows, name, { topLevelOnly: true }) ?? findCategoryByName(rows, name)
  if (!cat) return [name]
  return getCategoryAndDescendantIds(rows, cat).names
}

/** Parent category name when `name` is a subcategory (null if top-level or unknown). */
export function findParentCategoryName(
  rows: CategoryTreeRow[],
  name: string
): string | null {
  const cat = findCategoryByName(rows, name)
  if (!cat?.parent_id) return null
  const parent = rows.find((row) => row.id === cat.parent_id)
  return parent?.name?.trim() || null
}
