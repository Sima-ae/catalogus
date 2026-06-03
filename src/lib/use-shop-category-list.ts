'use client'

import { useEffect, useMemo, useState } from 'react'
import { buildShopCategoryMenu } from '@/lib/shop-category-menu'
import { fetchShopCategoryRows } from '@/lib/shop-categories-client'

/** Top-level category labels for shop sidebar and filters. */
export function useShopCategoryList() {
  const [categories, setCategories] = useState<string[]>(['All'])

  useEffect(() => {
    let cancelled = false
    fetchShopCategoryRows()
      .then((rows) => {
        if (cancelled) return
        setCategories(buildShopCategoryMenu(rows))
      })
      .catch(() => {
        if (!cancelled) setCategories(['All'])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return useMemo(() => categories, [categories])
}
