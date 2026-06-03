'use client'

import { appPath } from '@/lib/paths'
import type { CategoryTreeRow } from '@/lib/category-picker'

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
