'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { clearCatalogNavState } from '@/lib/catalog-scroll-restore'
import {
  isShopCatalogPath,
  parseCatalogPageParam,
  setCatalogPageParam,
  shopCatalogBasePath,
} from '@/lib/shop-catalog-url'

/**
 * Catalog list page synced to ?page=.
 * Page-only updates use history.replaceState so Next does not re-run RSC
 * (homepage nav SSR) on every Next click — keeps catalog snappy.
 */
export function useShopCatalogPage() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlPage = useMemo(
    () => parseCatalogPageParam(searchParams),
    [searchParams]
  )

  const [page, setPage] = useState(urlPage)

  useEffect(() => {
    setPage(urlPage)
  }, [urlPage])

  useEffect(() => {
    const onPopState = () => {
      if (typeof window === 'undefined') return
      const params = new URLSearchParams(window.location.search)
      setPage(parseCatalogPageParam(params))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const setCurrentPage = useCallback(
    (nextPage: number) => {
      if (!isShopCatalogPath(pathname)) return

      const safePage = Math.max(1, nextPage)
      setPage(safePage)
      clearCatalogNavState()

      const basePath = shopCatalogBasePath(pathname)
      const params = new URLSearchParams(searchParams.toString())
      setCatalogPageParam(params, safePage)
      const qs = params.toString()
      const href = qs ? `${basePath}?${qs}` : basePath

      if (typeof window !== 'undefined') {
        window.history.replaceState(window.history.state, '', href)
      }
    },
    [pathname, searchParams]
  )

  return { currentPage: page, setCurrentPage }
}
