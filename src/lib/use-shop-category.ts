'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useShopCategoryList } from '@/lib/use-shop-category-list'
import { useShopCategories } from '@/lib/use-shop-categories'
import {
  findParentCategoryName,
} from '@/lib/shop-category-tree'
import {
  catalogFilterBasePath,
  clearCatalogPageParam,
  clearShopSearchParam,
  isCatalogFilterPath,
} from '@/lib/shop-catalog-url'
import { parseCompoundCategoryParam } from '@/lib/shop-catalog-filter-url'
import { prefetchShopBrandMenu } from '@/lib/use-shop-brand-list'

export function useShopCategory() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const categoryMenu = useShopCategoryList()
  const categoryRows = useShopCategories()

  const selectedCategory = useMemo(() => {
    const raw = searchParams.get('category')?.trim()
    if (!raw) return 'All'
    if (categoryMenu.includes(raw)) return raw

    const parent = findParentCategoryName(categoryRows, raw)
    if (parent) return parent

    return 'All'
  }, [searchParams, categoryMenu, categoryRows])

  /** Old links like ?category=SHIRTS → ?category=SOCCER&subcategory=SHIRTS */
  useEffect(() => {
    const raw = searchParams.get('category')?.trim()
    if (!raw || raw === 'All' || categoryMenu.includes(raw)) return

    const compound = parseCompoundCategoryParam(raw)
    if (compound) {
      const basePath = catalogFilterBasePath(pathname)
      const params = new URLSearchParams(
        isCatalogFilterPath(pathname) ? searchParams.toString() : ''
      )
      params.set('category', compound.category)
      params.set('subcategory', compound.subcategory ?? '')
      if (!compound.subcategory) params.delete('subcategory')
      params.delete('brand')
      const qs = params.toString()
      router.replace(qs ? `${basePath}?${qs}` : basePath)
      return
    }

    if (!categoryRows.length) return

    const parent = findParentCategoryName(categoryRows, raw)
    if (!parent) return

    const basePath = catalogFilterBasePath(pathname)
    const params = new URLSearchParams(
      isCatalogFilterPath(pathname) ? searchParams.toString() : ''
    )
    params.set('category', parent)
    params.set('subcategory', raw)
    params.delete('brand')
    const qs = params.toString()
    router.replace(qs ? `${basePath}?${qs}` : basePath)
  }, [categoryMenu, categoryRows, pathname, router, searchParams])

  /** Drop ?category= when the category has no products and is hidden from the menu. */
  useEffect(() => {
    const raw = searchParams.get('category')?.trim()
    if (!raw || raw === 'All' || categoryMenu.length <= 1) return
    if (categoryMenu.includes(raw)) return
    if (!categoryRows.length) return
    if (findParentCategoryName(categoryRows, raw)) return
    if (parseCompoundCategoryParam(raw)) return

    const basePath = catalogFilterBasePath(pathname)
    const params = new URLSearchParams(
      isCatalogFilterPath(pathname) ? searchParams.toString() : ''
    )
    params.delete('category')
    params.delete('subcategory')
    params.delete('brand')
    const qs = params.toString()
    router.replace(qs ? `${basePath}?${qs}` : basePath)
  }, [categoryMenu, categoryRows, pathname, router, searchParams])

  useEffect(() => {
    const raw = searchParams.get('category')?.trim()
    const sub = searchParams.get('subcategory')?.trim() || 'All'
    if (raw && raw !== 'All') prefetchShopBrandMenu(raw, sub)
  }, [searchParams])

  const setSelectedCategory = useCallback(
    (category: string) => {
      if (category !== 'All') prefetchShopBrandMenu(category, 'All')
      const basePath = catalogFilterBasePath(pathname)
      const params = new URLSearchParams(
        isCatalogFilterPath(pathname) ? searchParams.toString() : ''
      )
      clearCatalogPageParam(params)
      clearShopSearchParam(params)
      if (category === 'All') {
        params.delete('category')
        params.delete('subcategory')
        params.delete('brand')
      } else {
        params.set('category', category)
        params.delete('subcategory')
        params.delete('brand')
      }
      const qs = params.toString()
      router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  return { selectedCategory, setSelectedCategory }
}
