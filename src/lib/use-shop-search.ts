'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { clearCatalogPageParam, isShopCatalogPath, shopCatalogBasePath } from '@/lib/shop-catalog-url'

export const SHOP_SEARCH_DEBOUNCE_MS = 300

/** Catalog search synced to ?search= in the URL (shareable, survives refresh). */
export function useShopSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams

  const urlSearch = useMemo(
    () => searchParams.get('search')?.trim() || '',
    [searchParams]
  )

  const [searchQuery, setSearchQuery] = useState(urlSearch)
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch)

  // URL is source of truth when navigation clears/changes ?search= (e.g. shared links).
  useEffect(() => {
    setSearchQuery(urlSearch)
    setDebouncedSearch(urlSearch)
  }, [urlSearch])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
    }, SHOP_SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  // Push debounced local search → URL. Do NOT re-run on searchParams changes or we fight
  // category/brand navigations that temporarily differ from React state (infinite replace loop).
  useEffect(() => {
    if (!isShopCatalogPath(pathname)) return
    const params = new URLSearchParams(searchParamsRef.current.toString())
    const current = params.get('search')?.trim() || ''
    if (current === debouncedSearch) return

    const basePath = shopCatalogBasePath(pathname)
    clearCatalogPageParam(params)
    if (debouncedSearch) params.set('search', debouncedSearch)
    else params.delete('search')

    const qs = params.toString()
    router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false })
  }, [debouncedSearch, pathname, router])

  const searchPending = searchQuery.trim() !== debouncedSearch

  const navigateToSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim()
      const params = new URLSearchParams()
      if (trimmed) params.set('search', trimmed)
      const qs = params.toString()
      router.push(qs ? `${shopCatalogBasePath(pathname)}?${qs}` : shopCatalogBasePath(pathname))
    },
    [pathname, router]
  )

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    searchPending,
    navigateToSearch,
  }
}
