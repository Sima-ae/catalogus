'use client'

import { appPath } from '@/lib/paths'
import type { CategoryTreeRow } from '@/lib/category-picker'
import type { ShopCategoryNavNode } from '@/lib/shop-category-nav'

type CategoryApiRow = CategoryTreeRow & { active?: boolean | number }

let cachedRows: CategoryTreeRow[] | null = null
let inflight: Promise<CategoryTreeRow[]> | null = null

function normalizeCategoryRows(data: unknown): CategoryTreeRow[] {
  if (!Array.isArray(data)) return []
  return data.map((row) => {
    const r = row as CategoryApiRow
    return {
      id: String(r.id ?? ''),
      name: String(r.name ?? ''),
      parent_id: r.parent_id ? String(r.parent_id) : null,
      parent_name: r.parent_name ? String(r.parent_name) : null,
      active: r.active,
    }
  })
}

let cachedMenu: string[] | null = null
let menuInflight: Promise<string[]> | null = null

let cachedNav: ShopCategoryNavNode[] | null = null
let navInflight: Promise<ShopCategoryNavNode[]> | null = null

/** Hierarchical shop categories for sidebar (roots → sub → nested). */
export function fetchShopCategoryNav(): Promise<ShopCategoryNavNode[]> {
  if (cachedNav) return Promise.resolve(cachedNav)
  if (navInflight) return navInflight

  navInflight = fetch(appPath('/api/categories/shop-nav'))
    .then((res) => (res.ok ? res.json() : { tree: [] }))
    .then((data) => {
      const tree = Array.isArray((data as { tree?: unknown }).tree)
        ? ((data as { tree: ShopCategoryNavNode[] }).tree ?? [])
        : []
      cachedNav = tree
      return cachedNav
    })
    .catch(() => [] as ShopCategoryNavNode[])
    .finally(() => {
      navInflight = null
    })

  return navInflight
}

/** Top-level category labels for shop pills — only categories with products. */
export function fetchShopCategoryMenu(): Promise<string[]> {
  if (cachedMenu) return Promise.resolve(cachedMenu)
  if (menuInflight) return menuInflight

  menuInflight = fetch(appPath('/api/categories/shop-menu'))
    .then((res) => (res.ok ? res.json() : ['All']))
    .then((data) => {
      const menu = Array.isArray(data)
        ? data.map((name) => String(name ?? '').trim()).filter(Boolean)
        : ['All']
      cachedMenu = menu.includes('All') ? menu : ['All', ...menu]
      return cachedMenu
    })
    .catch(() => ['All'] as string[])
    .finally(() => {
      menuInflight = null
    })

  return menuInflight
}

/** Single shared fetch for shop category pills, sidebar, and subcategory resolution. */
export function fetchShopCategoryRows(): Promise<CategoryTreeRow[]> {
  if (cachedRows) return Promise.resolve(cachedRows)
  if (inflight) return inflight

  inflight = fetch(appPath('/api/categories'))
    .then((res) => (res.ok ? res.json() : []))
    .then((data) => {
      cachedRows = normalizeCategoryRows(data)
      return cachedRows
    })
    .catch(() => [] as CategoryTreeRow[])
    .finally(() => {
      inflight = null
    })

  return inflight
}
