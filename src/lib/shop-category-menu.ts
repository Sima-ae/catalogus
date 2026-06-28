import type { CategoryTreeRow } from '@/lib/category-picker'
import { isQualifiedSiblingCategory } from '@/lib/shop-category-tree'
import {
  filterDuplicateShopMenuRoots,
  type ShopCategoryNavNode,
} from '@/lib/shop-category-nav'

export type CategoryRow = CategoryTreeRow & {
  active?: boolean | number
}

function isActiveCategoryRow(row: CategoryRow): boolean {
  return row.active !== false && row.active !== 0
}

function isMenuRootRow(rows: CategoryRow[], row: CategoryRow): boolean {
  const byId = new Map(rows.map((entry) => [String(entry.id), entry]))
  const parentId = row.parent_id
  if (parentId == null || String(parentId).trim() === '') return true
  const parent = byId.get(String(parentId))
  if (parent?.name && isQualifiedSiblingCategory(parent.name, row.name)) return true
  return false
}

function rawShopRootNames(rows: CategoryRow[]): string[] {
  const active = rows.filter(isActiveCategoryRow)
  const names = active
    .filter((row) => isMenuRootRow(active, row))
    .map((row) => String(row.name || '').trim())
    .filter(Boolean)
  return Array.from(new Set(names))
}

/** Top-level shop category names (no "All", no duplicate orphan roots). */
export function buildShopTopCategoryNames(rows: CategoryRow[]): string[] {
  const active = rows.filter(isActiveCategoryRow)
  return filterDuplicateShopMenuRoots(active, rawShopRootNames(active))
}

/** Build shop sidebar / filter menu: "All" + top-level active categories only. */
export function buildShopCategoryMenu(rows: CategoryRow[]): string[] {
  return ['All', ...buildShopTopCategoryNames(rows)]
}

export type { ShopCategoryNavNode }
