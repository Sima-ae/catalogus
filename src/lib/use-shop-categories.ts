'use client'

import { useEffect, useMemo, useState } from 'react'
import { appPath } from '@/lib/paths'
import type { CategoryTreeRow } from '@/lib/category-picker'

/** Full category tree rows from the database (for subcategory filters). */
export function useShopCategories() {
  const [categories, setCategories] = useState<CategoryTreeRow[]>([])

  useEffect(() => {
    let cancelled = false
    fetch(appPath('/api/categories'))
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data)) return
        setCategories(
          data.map((row) => {
            const r = row as CategoryTreeRow & { active?: boolean }
            return {
              id: String(r.id ?? ''),
              name: String(r.name ?? ''),
              parent_id: r.parent_id ? String(r.parent_id) : null,
              parent_name: r.parent_name ? String(r.parent_name) : null,
              active: r.active,
            }
          })
        )
      })
      .catch(() => {
        if (!cancelled) setCategories([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return useMemo(() => categories, [categories])
}
