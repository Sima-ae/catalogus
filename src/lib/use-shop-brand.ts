'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useShopBrandList } from '@/lib/use-shop-brand-list'
import { useShopSubcategory } from '@/lib/use-shop-subcategory'
import { shouldShowShopBrandFilter } from '@/lib/shop-brand-menu'
import { clearCatalogPageParam, isShopCatalogPath, shopCatalogBasePath } from '@/lib/shop-catalog-url'

export function useShopBrand() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedCategory = useMemo(() => {
    const raw = searchParams.get('category')?.trim()
    return raw || 'All'
  }, [searchParams])

  const {
    selectedSubcategory,
    hasSubcategories,
    loadingSubcategories,
  } = useShopSubcategory(selectedCategory)

  const brandFilterActive = shouldShowShopBrandFilter({
    selectedCategory,
    selectedSubcategory,
    hasSubcategories,
    loadingSubcategories,
  })

  const brandMenuState = useShopBrandList(
    selectedCategory,
    selectedSubcategory,
    brandFilterActive
  )
  const brandMenu = brandMenuState.brands

  const selectedBrand = useMemo(() => {
    if (!brandFilterActive) return 'All'
    const raw = searchParams.get('brand')?.trim()
    if (!raw) return 'All'
    return brandMenu.includes(raw) ? raw : 'All'
  }, [searchParams, brandMenu, brandFilterActive])

  useEffect(() => {
    if (!isShopCatalogPath(pathname)) return
    if (brandFilterActive) {
      const raw = searchParams.get('brand')?.trim()
      if (!raw || brandMenu.includes(raw)) return
      if (brandMenu.length === 0) return
    } else {
      const raw = searchParams.get('brand')?.trim()
      if (!raw) return
    }

    const basePath = shopCatalogBasePath(pathname)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('brand')
    clearCatalogPageParam(params)
    const qs = params.toString()
    router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false })
  }, [brandFilterActive, brandMenu, pathname, router, searchParams])

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
