'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { clearCatalogNavState } from '@/lib/catalog-scroll-restore'
import {
  isShopCatalogPath,
  parseCatalogPageParam,
  setCatalogPageParam,
  shopCatalogBasePath,
} from '@/lib/shop-catalog-url'

/** Catalog list page synced to ?page= (survives browser back/forward). */
export function useShopCatalogPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlPage = useMemo(
    () => parseCatalogPageParam(searchParams),
    [searchParams]
  )

  /** Optimistic page — pricelist-style instant updates while URL catches up. */
  const [page, setPage] = useState(urlPage)

  useEffect(() => {
    setPage(urlPage)
  }, [urlPage])

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

      router.replace(href, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  return { currentPage: page, setCurrentPage }
}
