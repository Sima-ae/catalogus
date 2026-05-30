'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useShopCategoryList } from '@/lib/use-shop-category-list'
import { appPath, isAppPath } from '@/lib/paths'

const CATALOG_PATHS = ['/', '/new']

function isCatalogPath(pathname: string | null) {
  if (!pathname) return false
  return CATALOG_PATHS.some((p) => isAppPath(pathname, p) || pathname === p)
}

export function useShopCategory() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const categoryMenu = useShopCategoryList()

  const selectedCategory = useMemo(() => {
    const raw = searchParams.get('category')?.trim()
    if (!raw) return 'All'
    return categoryMenu.includes(raw) ? raw : 'All'
  }, [searchParams, categoryMenu])

  const setSelectedCategory = useCallback(
    (category: string) => {
      const basePath = isCatalogPath(pathname) ? pathname!.split('?')[0] : appPath('/')
      const params = new URLSearchParams(
        isCatalogPath(pathname) ? searchParams.toString() : ''
      )
      if (category === 'All') {
        params.delete('category')
        params.delete('brand')
      } else {
        params.set('category', category)
      }
      const qs = params.toString()
      router.push(qs ? `${basePath}?${qs}` : basePath)
    },
    [pathname, router, searchParams]
  )

  return { selectedCategory, setSelectedCategory }
}
