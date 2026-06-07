'use client'

import { useEffect, useMemo, useState } from 'react'
import { appPath } from '@/lib/paths'
import { buildShopBrandMenu, type BrandRow } from '@/lib/shop-brand-menu'

const brandCache = new Map<string, string[]>()
const brandInflight = new Map<string, Promise<string[]>>()

function brandCacheKey(selectedCategory: string, selectedSubcategory: string): string {
  return `${selectedCategory}|${selectedSubcategory}`
}

async function fetchShopBrandMenu(
  selectedCategory: string,
  selectedSubcategory: string
): Promise<string[]> {
  const key = brandCacheKey(selectedCategory, selectedSubcategory)
  const cached = brandCache.get(key)
  if (cached) return cached

  const pending = brandInflight.get(key)
  if (pending) return pending

  const params = new URLSearchParams()
  if (selectedCategory && selectedCategory !== 'All') {
    params.set('category', selectedCategory)
  }
  if (selectedSubcategory && selectedSubcategory !== 'All') {
    params.set('subcategory', selectedSubcategory)
  }
  const qs = params.toString()
  const url = qs ? `${appPath('/api/brands')}?${qs}` : appPath('/api/brands')

  const request = fetch(url)
    .then((res) => (res.ok ? res.json() : []))
    .then((data: unknown) => {
      if (!Array.isArray(data)) return []
      const menu = buildShopBrandMenu(data as BrandRow[])
      brandCache.set(key, menu)
      return menu
    })
    .catch(() => [] as string[])
    .finally(() => {
      brandInflight.delete(key)
    })

  brandInflight.set(key, request)
  return request
}

/** Warm the client cache when the user picks a category (parallel with other fetches). */
export function prefetchShopBrandMenu(
  selectedCategory: string,
  selectedSubcategory: string = 'All'
): void {
  if (!selectedCategory || selectedCategory === 'All') return
  void fetchShopBrandMenu(selectedCategory, selectedSubcategory)
}

export type ShopBrandListState = {
  brands: string[]
  loading: boolean
}

/** Brand labels for shop filters — only brands with products in the selected category. */
export function useShopBrandList(
  selectedCategory: string = 'All',
  selectedSubcategory: string = 'All',
  enabled: boolean = true
): ShopBrandListState {
  const cacheKey = brandCacheKey(selectedCategory, selectedSubcategory)
  const cachedMenu = enabled ? brandCache.get(cacheKey) : undefined

  const [brands, setBrands] = useState<string[]>(() => cachedMenu ?? [])
  const [loading, setLoading] = useState(
    () => enabled && selectedCategory !== 'All' && !cachedMenu
  )

  useEffect(() => {
    if (!enabled || !selectedCategory || selectedCategory === 'All') {
      setBrands([])
      setLoading(false)
      return
    }

    const hit = brandCache.get(cacheKey)
    if (hit) {
      setBrands(hit)
      setLoading(false)
    } else {
      setLoading(true)
    }

    let cancelled = false
    fetchShopBrandMenu(selectedCategory, selectedSubcategory)
      .then((menu) => {
        if (!cancelled) {
          setBrands(menu)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBrands([])
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [cacheKey, selectedCategory, selectedSubcategory, enabled])

  return useMemo(() => ({ brands, loading }), [brands, loading])
}
