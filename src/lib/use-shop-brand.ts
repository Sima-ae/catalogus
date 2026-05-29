'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useShopBrandList } from '@/lib/use-shop-brand-list'
import { appPath, isAppPath } from '@/lib/paths'

const CATALOG_PATHS = ['/', '/new', '/popular']

function isCatalogPath(pathname: string | null) {
  if (!pathname) return false
  return CATALOG_PATHS.some((p) => isAppPath(pathname, p) || pathname === p)
}

export function useShopBrand() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const brandMenu = useShopBrandList()

  const selectedBrand = useMemo(() => {
    const raw = searchParams.get('brand')?.trim()
    if (!raw) return 'All'
    return brandMenu.includes(raw) ? raw : 'All'
  }, [searchParams, brandMenu])

  const setSelectedBrand = useCallback(
    (brand: string) => {
      const basePath = isCatalogPath(pathname) ? pathname!.split('?')[0] : appPath('/')
      const params = new URLSearchParams(
        isCatalogPath(pathname) ? searchParams.toString() : ''
      )
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
