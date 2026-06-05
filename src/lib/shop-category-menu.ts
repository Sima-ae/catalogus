import type { CategoryTreeRow } from '@/lib/category-picker'
import { isQualifiedSiblingCategory } from '@/lib/shop-category-tree'

export type CategoryRow = CategoryTreeRow & {
  active?: boolean | number
}

function isActiveCategoryRow(row: CategoryRow): boolean {
  return row.active !== false && row.active !== 0
}

/** Build shop sidebar / filter menu: "All" + top-level active categories only. */
export function buildShopCategoryMenu(rows: CategoryRow[]): string[] {
  const byId = new Map(rows.map((row) => [String(row.id), row]))

  const names = rows
    .filter(isActiveCategoryRow)
    .filter((row) => {
      const parentId = row.parent_id
      if (parentId == null || String(parentId).trim() === '') return true
      const parent = byId.get(String(parentId))
      if (parent?.name && isQualifiedSiblingCategory(parent.name, row.name)) return true
      return false
    })
    .map((row) => String(row.name || '').trim())
    .filter(Boolean)

  const unique = Array.from(new Set(names))
  return ['All', ...unique]
}
