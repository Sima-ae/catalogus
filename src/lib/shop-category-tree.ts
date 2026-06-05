import type { CategoryTreeRow } from '@/lib/category-picker'
import { formatCategoryDisplayName } from '@/lib/category-picker'

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

function isActiveRow(row: CategoryTreeRow): boolean {
  const active = (row as { active?: boolean | number }).active
  return active !== false && active !== 0
}

/**
 * Names like "KIDS SLIPPERS" under parent "SLIPPERS" are separate shop categories,
 * not subcategories — they must not roll up into the parent filter or subcategory pills.
 */
export function isQualifiedSiblingCategory(parentName: string, childName: string): boolean {
  const parent = normalizeName(parentName)
  const child = normalizeName(childName)
  if (!parent || !child || parent === child) return false
  return child.endsWith(` ${parent}`)
}

/** Shop sidebar / pills: true for top-level rows and detached qualified siblings. */
export function isShopTopLevelCategory(rows: CategoryTreeRow[], name: string): boolean {
  const cat = findCategoryByName(rows, name)
  if (!cat) return false
  if (!cat.parent_id) return true
  const parent = rows.find((row) => row.id === cat.parent_id)
  if (!parent?.name) return false
  return isQualifiedSiblingCategory(parent.name, cat.name)
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
    .filter(
      (row) =>
        row.parent_id === parent.id &&
        isActiveRow(row) &&
        !isQualifiedSiblingCategory(parent.name, row.name)
    )
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
  const walk = (parentId: string, parentName: string) => {
    for (const row of rows) {
      if (row.parent_id === parentId && isActiveRow(row)) {
        if (isQualifiedSiblingCategory(parentName, row.name)) continue
        ids.push(row.id)
        names.push(row.name)
        walk(row.id, row.name)
      }
    }
  }
  walk(cat.id, cat.name)
  return { ids, names }
}

export type ShopCategoryFilterInput = {
  category?: string
  subcategory?: string
}

export type ShopCategoryFilterResult = {
  categoryIds: string[]
  /** Qualified labels for legacy `products.category` text (e.g. KIDS › SHOES). */
  legacyNames: string[]
  /** When true, match one subcategory only (not parent roll-up). */
  strictIdOnly: boolean
  /** Primary qualified label when strictIdOnly (subcategory pill filter). */
  categoryStorageLabel?: string
  /** Homonymous subcategory ids under other parents (e.g. KIDS › SHOES when filtering top SHOES). */
  excludeCategoryIds?: string[]
}

function storageLabelForRow(rows: CategoryTreeRow[], row: CategoryTreeRow): string {
  if (!row.parent_id) return String(row.name).trim()
  const parent = rows.find((r) => r.id === row.parent_id)
  return formatCategoryDisplayName(String(row.name), parent?.name ? String(parent.name) : null)
}

/** Same display name under a different parent (e.g. SHOES under KIDS vs top-level SHOES). */
export function getHomonymousSubcategoryIdsElsewhere(
  rows: CategoryTreeRow[],
  anchor: CategoryTreeRow
): string[] {
  if (anchor.parent_id) return []
  const nameKey = normalizeName(anchor.name)
  return rows
    .filter(
      (row) =>
        row.parent_id &&
        row.parent_id !== anchor.id &&
        normalizeName(row.name) === nameKey &&
        isActiveRow(row)
    )
    .map((row) => row.id)
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
    if (
      !child ||
      isQualifiedSiblingCategory(parent.name, child.name)
    ) {
      return { categoryIds: [], legacyNames: [], strictIdOnly: true }
    }
    return {
      categoryIds: [child.id],
      legacyNames: [storageLabelForRow(rows, child)],
      strictIdOnly: true,
      categoryStorageLabel: storageLabelForRow(rows, child),
    }
  }

  const anchor =
    findCategoryByName(rows, category, { topLevelOnly: true }) ??
    findCategoryByName(rows, category)
  if (!anchor) return undefined

  const { ids } = getCategoryAndDescendantIds(rows, anchor)
  const legacyNames = ids
    .map((id) => rows.find((row) => row.id === id))
    .filter((row): row is CategoryTreeRow => Boolean(row))
    .map((row) => storageLabelForRow(rows, row))
  const excludeCategoryIds = getHomonymousSubcategoryIdsElsewhere(rows, anchor)
  return {
    categoryIds: ids,
    legacyNames,
    strictIdOnly: false,
    excludeCategoryIds: excludeCategoryIds.length ? excludeCategoryIds : undefined,
  }
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
  if (!parent?.name) return null
  if (isQualifiedSiblingCategory(parent.name, cat.name)) return null
  return parent.name.trim()
}
