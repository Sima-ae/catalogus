'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useShopBrandList } from '@/lib/use-shop-brand-list'
import type {
  ShopNestedSubcategoryHookValue,
  ShopSubcategoryHookValue,
} from '@/lib/use-shop-subcategory'
import {
  findShopBrandInMenu,
  shouldShowShopBrandFilter,
} from '@/lib/shop-brand-menu'
import {
  catalogFilterBasePath,
  clearCatalogPageParam,
  isCatalogFilterPath,
} from '@/lib/shop-catalog-url'
import { useCatalogRouterReplace } from '@/lib/use-catalog-router'

type UseShopBrandOptions = {
  selectedCategory: string
  subcategoryState: Pick<
    ShopSubcategoryHookValue,
    'selectedSubcategory' | 'hasSubcategories' | 'loadingSubcategories'
  >
  nestedSubcategoryState?: Pick<
    ShopNestedSubcategoryHookValue,
    'selectedNestedSubcategory' | 'hasNestedSubcategories' | 'loadingNestedSubcategories'
  >
}

export function useShopBrand({
  selectedCategory,
  subcategoryState,
  nestedSubcategoryState,
}: UseShopBrandOptions) {
  const { replace } = useCatalogRouterReplace()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const {
    selectedSubcategory,
    hasSubcategories,
    loadingSubcategories,
  } = subcategoryState

  const selectedNestedSubcategory =
    nestedSubcategoryState?.selectedNestedSubcategory ?? 'All'
  const hasNestedSubcategories = nestedSubcategoryState?.hasNestedSubcategories ?? false
  const loadingNestedSubcategories =
    nestedSubcategoryState?.loadingNestedSubcategories ?? false

  const brandFilterActive = shouldShowShopBrandFilter({
    selectedCategory,
    selectedSubcategory,
    selectedNestedSubcategory,
    hasSubcategories,
    hasNestedSubcategories,
    loadingSubcategories,
    loadingNestedSubcategories,
  })

  const brandMenuState = useShopBrandList(
    selectedCategory,
    selectedSubcategory,
    selectedNestedSubcategory,
    brandFilterActive
  )
  const brandMenu = brandMenuState.brands
  const loadingBrands = brandMenuState.loading

  const selectedBrand = useMemo(() => {
    if (!brandFilterActive) return 'All'
    const raw = searchParams.get('brand')?.trim()
    if (!raw) return 'All'
    const match = findShopBrandInMenu(raw, brandMenu)
    if (match) return match
    if (loadingBrands || brandMenu.length === 0) return raw
    return 'All'
  }, [searchParams, brandMenu, brandFilterActive, loadingBrands])

  useEffect(() => {
    if (!isCatalogFilterPath(pathname)) return
    const raw = searchParams.get('brand')?.trim()
    if (!raw) return

    if (!brandFilterActive) return

    if (findShopBrandInMenu(raw, brandMenu)) return
    if (loadingBrands || brandMenu.length === 0) return

    const basePath = catalogFilterBasePath(pathname)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('brand')
    clearCatalogPageParam(params)
    const qs = params.toString()
    replace(qs ? `${basePath}?${qs}` : basePath)
  }, [
    brandFilterActive,
    brandMenu,
    loadingBrands,
    loadingNestedSubcategories,
    loadingSubcategories,
    pathname,
    replace,
    searchParams,
  ])

  const setSelectedBrand = useCallback(
    (brand: string) => {
      const basePath = catalogFilterBasePath(pathname)
      const params = new URLSearchParams(
        isCatalogFilterPath(pathname) ? searchParams.toString() : ''
      )
      clearCatalogPageParam(params)
      if (brand === 'All') {
        params.delete('brand')
      } else {
        params.set('brand', brand)
      }
      const qs = params.toString()
      replace(qs ? `${basePath}?${qs}` : basePath)
    },
    [pathname, replace, searchParams]
  )

  return { selectedBrand, setSelectedBrand }
}
