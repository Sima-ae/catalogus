'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { localizedAppPath } from '@/lib/i18n-routing'
import { clearCatalogPageParam, isShopCatalogPath } from '@/lib/shop-catalog-url'

export const SHOP_SEARCH_DEBOUNCE_MS = 300

/** Catalog search synced to ?search= in the URL (shareable, survives refresh). */
export function useShopSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlSearch = useMemo(
    () => searchParams.get('search')?.trim() || '',
    [searchParams]
  )

  const [searchQuery, setSearchQuery] = useState(urlSearch)
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch)

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

  useEffect(() => {
    if (!isShopCatalogPath(pathname)) return
    const current = searchParams.get('search')?.trim() || ''
    if (current === debouncedSearch) return

    const basePath = pathname!.split('?')[0]
    const params = new URLSearchParams(searchParams.toString())
    clearCatalogPageParam(params)
    if (debouncedSearch) params.set('search', debouncedSearch)
    else params.delete('search')

    const qs = params.toString()
    router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false })
  }, [debouncedSearch, pathname, router, searchParams])

  const searchPending = searchQuery.trim() !== debouncedSearch

  const navigateToSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim()
      const params = new URLSearchParams()
      if (trimmed) params.set('search', trimmed)
      const qs = params.toString()
      router.push(qs ? `${localizedAppPath(pathname, '/')}?${qs}` : localizedAppPath(pathname, '/'))
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
