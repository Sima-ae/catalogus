'use client'

import { useEffect, useState } from 'react'
import type { ShopCategoryNavNode } from '@/lib/shop-category-nav'
import {
  fetchShopCategoryNav,
  getCachedShopCategoryNavSync,
  prefetchShopCategoryNav,
} from '@/lib/shop-categories-client'

/** Hierarchical shop category tree for sidebar navigation. */
export function useShopCategoryNav() {
  const [tree, setTree] = useState<ShopCategoryNavNode[]>(() => getCachedShopCategoryNavSync())
  const [loading, setLoading] = useState(() => getCachedShopCategoryNavSync().length === 0)

  useEffect(() => {
    prefetchShopCategoryNav()
    const cached = getCachedShopCategoryNavSync()
    if (cached.length) {
      setTree(cached)
      setLoading(false)
      return
    }

    let cancelled = false
    fetchShopCategoryNav()
      .then((nodes) => {
        if (!cancelled) setTree(nodes)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { tree, loading }
}
