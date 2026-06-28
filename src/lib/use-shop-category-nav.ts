'use client'

import { useEffect, useState } from 'react'
import type { ShopCategoryNavNode } from '@/lib/shop-category-nav'
import { fetchShopCategoryNav } from '@/lib/shop-categories-client'

/** Hierarchical shop category tree for sidebar navigation. */
export function useShopCategoryNav() {
  const [tree, setTree] = useState<ShopCategoryNavNode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
