'use client'

import { useEffect, useMemo, useState } from 'react'
import { appPath } from '@/lib/paths'
import { buildShopCategoryMenu, type CategoryRow } from '@/lib/shop-category-menu'

/** Top-level category labels for shop sidebar and filters. */
export function useShopCategoryList() {
  const [categories, setCategories] = useState<string[]>(['All'])

  useEffect(() => {
    let cancelled = false
    fetch(appPath('/api/categories'))
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data)) return
        setCategories(buildShopCategoryMenu(data as CategoryRow[]))
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
