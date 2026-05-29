'use client'

import { useEffect, useMemo, useState } from 'react'
import { appPath } from '@/lib/paths'
import { buildShopBrandMenu, type BrandRow } from '@/lib/shop-brand-menu'

/** Brand labels for shop filters — synced from the `brands` table. */
export function useShopBrandList() {
  const [brands, setBrands] = useState<string[]>(['All'])

  useEffect(() => {
    let cancelled = false
    fetch(appPath('/api/brands'))
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
  }, [])

  return useMemo(() => brands, [brands])
}
