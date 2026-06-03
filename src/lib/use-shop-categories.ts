'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CategoryTreeRow } from '@/lib/category-picker'
import { fetchShopCategoryRows } from '@/lib/shop-categories-client'

/** Full category tree rows from the database (for subcategory filters). */
export function useShopCategories() {
  const [categories, setCategories] = useState<CategoryTreeRow[]>([])

  useEffect(() => {
    let cancelled = false
    fetchShopCategoryRows()
      .then((rows) => {
        if (!cancelled) setCategories(rows)
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
