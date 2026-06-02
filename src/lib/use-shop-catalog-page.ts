'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  isShopCatalogPath,
  parseCatalogPageParam,
  setCatalogPageParam,
} from '@/lib/shop-catalog-url'

/** Catalog list page synced to ?page= (survives browser back/forward). */
export function useShopCatalogPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentPage = useMemo(
    () => parseCatalogPageParam(searchParams),
    [searchParams]
  )

  const setCurrentPage = useCallback(
    (page: number) => {
      if (!isShopCatalogPath(pathname)) return
      const basePath = pathname!.split('?')[0]
      const params = new URLSearchParams(searchParams.toString())
      setCatalogPageParam(params, page)
      const qs = params.toString()
      router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  return { currentPage, setCurrentPage }
}
