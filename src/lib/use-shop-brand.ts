'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useShopBrandList } from '@/lib/use-shop-brand-list'
import { clearCatalogPageParam, isShopCatalogPath, shopCatalogBasePath } from '@/lib/shop-catalog-url'

export function useShopBrand() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedCategory = useMemo(() => {
    const raw = searchParams.get('category')?.trim()
    return raw || 'All'
  }, [searchParams])

  const brandMenu = useShopBrandList(selectedCategory)

  const selectedBrand = useMemo(() => {
    const raw = searchParams.get('brand')?.trim()
    if (!raw) return 'All'
    return brandMenu.includes(raw) ? raw : 'All'
  }, [searchParams, brandMenu])

  const setSelectedBrand = useCallback(
    (brand: string) => {
      const basePath = shopCatalogBasePath(pathname)
      const params = new URLSearchParams(
        isShopCatalogPath(pathname) ? searchParams.toString() : ''
      )
      clearCatalogPageParam(params)
      if (brand === 'All') {
        params.delete('brand')
      } else {
        params.set('brand', brand)
      }
      const qs = params.toString()
      router.push(qs ? `${basePath}?${qs}` : basePath)
    },
    [pathname, router, searchParams]
  )

  return { selectedBrand, setSelectedBrand }
}
