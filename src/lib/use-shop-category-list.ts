'use client'

import { useEffect, useMemo, useState } from 'react'
import { appPath } from '@/lib/paths'
import { mergeShopCategoryLabels } from '@/lib/merge-shop-categories'
import { SHOP_CATEGORIES } from '@/lib/shop-categories'

type ApiCategory = { name?: string }

export function useShopCategoryList() {
  const [fromApi, setFromApi] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    fetch(appPath('/api/categories'))
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data)) return
        const names = data
          .map((row) => (row as ApiCategory).name?.trim())
          .filter((name): name is string => Boolean(name))
        setFromApi(names)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return useMemo(
    () => mergeShopCategoryLabels(SHOP_CATEGORIES, fromApi),
    [fromApi]
  )
}
