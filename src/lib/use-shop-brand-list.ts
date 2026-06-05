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
      if (!Array.isArray(data)) return ['All']
      const menu = buildShopBrandMenu(data as BrandRow[])
      brandCache.set(key, menu)
      return menu
    })
    .catch(() => ['All'] as string[])
    .finally(() => {
      brandInflight.delete(key)
    })

  brandInflight.set(key, request)
  return request
}

/** Brand labels for shop filters — only brands with products in the selected category. */
export function useShopBrandList(
  selectedCategory: string = 'All',
  selectedSubcategory: string = 'All'
) {
  const [brands, setBrands] = useState<string[]>(['All'])

  useEffect(() => {
    let cancelled = false
    fetchShopBrandMenu(selectedCategory, selectedSubcategory)
      .then((menu) => {
        if (!cancelled) setBrands(menu)
      })
      .catch(() => {
        if (!cancelled) setBrands(['All'])
      })
    return () => {
      cancelled = true
    }
  }, [selectedCategory, selectedSubcategory])

  return useMemo(() => brands, [brands])
}
