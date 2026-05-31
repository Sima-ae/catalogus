'use client'

import { useEffect, useMemo, useState } from 'react'
import { appPath } from '@/lib/paths'
import { buildShopBrandMenu, type BrandRow } from '@/lib/shop-brand-menu'

/** Brand labels for shop filters — optional category narrows linked brands. */
export function useShopBrandList(
  selectedCategory: string = 'All',
  selectedSubcategory: string = 'All'
) {
  const [brands, setBrands] = useState<string[]>(['All'])

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams()
    if (selectedCategory && selectedCategory !== 'All') {
      params.set('category', selectedCategory)
    }
    if (selectedSubcategory && selectedSubcategory !== 'All') {
      params.set('subcategory', selectedSubcategory)
    }
    const qs = params.toString()
    const url = qs ? `${appPath('/api/brands')}?${qs}` : appPath('/api/brands')

    fetch(url)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data)) return
        setBrands(buildShopBrandMenu(data as BrandRow[]))
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
