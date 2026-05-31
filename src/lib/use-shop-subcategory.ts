'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getDirectChildCategories } from '@/lib/shop-category-tree'
import { useShopCategories } from '@/lib/use-shop-categories'
import { appPath, isAppPath } from '@/lib/paths'

const CATALOG_PATHS = ['/', '/new']

function isCatalogPath(pathname: string | null) {
  if (!pathname) return false
  return CATALOG_PATHS.some((p) => isAppPath(pathname, p) || pathname === p)
}

export function useShopSubcategory(selectedCategory: string) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const categories = useShopCategories()

  const childNames = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'All') return []
    return getDirectChildCategories(categories, selectedCategory).map((c) => c.name)
  }, [categories, selectedCategory])

  const hasSubcategories = childNames.length > 0

  const selectedSubcategory = useMemo(() => {
    if (!hasSubcategories) return 'All'
    const raw = searchParams.get('subcategory')?.trim()
    if (!raw) return 'All'
    return childNames.some((name) => name.toLowerCase() === raw.toLowerCase()) ? raw : 'All'
  }, [searchParams, childNames, hasSubcategories])

  const setSelectedSubcategory = useCallback(
    (subcategory: string) => {
      const basePath = isCatalogPath(pathname) ? pathname!.split('?')[0] : appPath('/')
      const params = new URLSearchParams(
        isCatalogPath(pathname) ? searchParams.toString() : ''
      )
      if (subcategory === 'All') {
        params.delete('subcategory')
      } else {
        params.set('subcategory', subcategory)
      }
      params.delete('brand')
      const qs = params.toString()
      router.push(qs ? `${basePath}?${qs}` : basePath)
    },
    [pathname, router, searchParams]
  )

  return {
    selectedSubcategory,
    setSelectedSubcategory,
    subcategoryOptions: childNames,
    hasSubcategories,
  }
}
