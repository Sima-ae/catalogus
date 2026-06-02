'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useShopCategoryList } from '@/lib/use-shop-category-list'
import { useShopCategories } from '@/lib/use-shop-categories'
import { findParentCategoryName } from '@/lib/shop-category-tree'
import { appPath } from '@/lib/paths'
import { clearCatalogPageParam, isShopCatalogPath } from '@/lib/shop-catalog-url'

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

    const parent = findParentCategoryName(categoryRows, raw)
    if (!parent) return

    const basePath = isShopCatalogPath(pathname) ? pathname!.split('?')[0] : appPath('/')
    const params = new URLSearchParams(
      isShopCatalogPath(pathname) ? searchParams.toString() : ''
    )
    params.set('category', parent)
    params.set('subcategory', raw)
    params.delete('brand')
    const qs = params.toString()
    router.replace(qs ? `${basePath}?${qs}` : basePath)
  }, [categoryMenu, categoryRows, pathname, router, searchParams])

  const setSelectedCategory = useCallback(
    (category: string) => {
      const basePath = isShopCatalogPath(pathname) ? pathname!.split('?')[0] : appPath('/')
      const params = new URLSearchParams(
        isShopCatalogPath(pathname) ? searchParams.toString() : ''
      )
      clearCatalogPageParam(params)
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
      router.push(qs ? `${basePath}?${qs}` : basePath)
    },
    [pathname, router, searchParams]
  )

  return { selectedCategory, setSelectedCategory }
}
