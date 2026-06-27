'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { sortShopCategoriesByLabel } from '@/lib/i18n-categories'
import { useI18n } from '@/lib/i18n-context'
import { appPath } from '@/lib/paths'
import {
  catalogFilterBasePath,
  clearCatalogPageParam,
  clearShopSearchParam,
  isCatalogFilterPath,
} from '@/lib/shop-catalog-url'

export type ShopSubcategoryRow = {
  id: string
  name: string
  productCount: number
}

export type ShopSubcategoryHookValue = {
  selectedSubcategory: string
  setSelectedSubcategory: (subcategory: string) => void
  subcategoryOptions: string[]
  hasSubcategories: boolean
  loadingSubcategories: boolean
}

const subcategoryCache = new Map<string, ShopSubcategoryRow[]>()
const subcategoryInflight = new Map<string, Promise<ShopSubcategoryRow[]>>()

async function fetchShopSubcategories(selectedCategory: string): Promise<ShopSubcategoryRow[]> {
  const key = selectedCategory.trim().toLowerCase()
  const cached = subcategoryCache.get(key)
  if (cached) return cached

  const pending = subcategoryInflight.get(key)
  if (pending) return pending

  const params = new URLSearchParams({ category: selectedCategory })
  const request = fetch(appPath(`/api/categories/subcategories?${params.toString()}`))
    .then((res) => (res.ok ? res.json() : { subcategories: [] }))
    .then((data: unknown) => {
      const rows =
        data &&
        typeof data === 'object' &&
        Array.isArray((data as { subcategories?: unknown }).subcategories)
          ? ((data as { subcategories: ShopSubcategoryRow[] }).subcategories ?? [])
          : []
      const filtered = rows.filter(
        (row) => row?.name && (row.productCount ?? 0) > 0
      ) as ShopSubcategoryRow[]
      subcategoryCache.set(key, filtered)
      return filtered
    })
    .catch(() => [] as ShopSubcategoryRow[])
    .finally(() => {
      subcategoryInflight.delete(key)
    })

  subcategoryInflight.set(key, request)
  return request
}

/** Clear client subcategory cache after taxonomy changes. */
export function invalidateShopSubcategoryCache(): void {
  subcategoryCache.clear()
  subcategoryInflight.clear()
}

/** Subcategory pills for the current parent category — only rows with products. */
export function useShopSubcategory(selectedCategory: string): ShopSubcategoryHookValue {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()

  const cacheKey = selectedCategory.trim().toLowerCase()
  const cachedRows =
    selectedCategory && selectedCategory !== 'All' ? subcategoryCache.get(cacheKey) : undefined

  const [subcategories, setSubcategories] = useState<ShopSubcategoryRow[]>(() => cachedRows ?? [])
  const [loading, setLoading] = useState(
    () => Boolean(selectedCategory && selectedCategory !== 'All' && !cachedRows)
  )

  useEffect(() => {
    if (!selectedCategory || selectedCategory === 'All') {
      setSubcategories([])
      setLoading(false)
      return
    }

    const hit = subcategoryCache.get(cacheKey)
    if (hit) {
      setSubcategories(hit)
      setLoading(false)
    } else {
      setLoading(true)
    }

    let cancelled = false
    fetchShopSubcategories(selectedCategory)
      .then((rows) => {
        if (!cancelled) setSubcategories(rows)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedCategory, cacheKey])

  const subcategoryOptions = useMemo(
    () => sortShopCategoriesByLabel(subcategories.map((row) => row.name), t, locale),
    [subcategories, t, locale]
  )

  const hasSubcategories = subcategoryOptions.length > 0

  const legacySubcategoryFromCategoryParam = useMemo(() => {
    const rawCategory = searchParams.get('category')?.trim()
    if (!rawCategory || rawCategory === 'All') return null
    if (!selectedCategory || selectedCategory === 'All') return null
    if (rawCategory.toLowerCase() === selectedCategory.toLowerCase()) return null
    return (
      subcategoryOptions.find(
        (name) => name.toLowerCase() === rawCategory.toLowerCase()
      ) ?? null
    )
  }, [searchParams, selectedCategory, subcategoryOptions])

  const selectedSubcategory = useMemo(() => {
    const raw = searchParams.get('subcategory')?.trim()
    if (raw) {
      const match = subcategoryOptions.find(
        (name) => name.toLowerCase() === raw.toLowerCase()
      )
      if (match) return match
    }
    if (legacySubcategoryFromCategoryParam) return legacySubcategoryFromCategoryParam
    if (!hasSubcategories) return 'All'
    return 'All'
  }, [searchParams, subcategoryOptions, hasSubcategories, legacySubcategoryFromCategoryParam])

  const setSelectedSubcategory = useCallback(
    (subcategory: string) => {
      const basePath = catalogFilterBasePath(pathname)
      const params = new URLSearchParams(
        isCatalogFilterPath(pathname) ? searchParams.toString() : ''
      )
      clearCatalogPageParam(params)
      clearShopSearchParam(params)
      if (subcategory === 'All') {
        params.delete('subcategory')
      } else {
        params.set('subcategory', subcategory)
      }
      params.delete('brand')
      const qs = params.toString()
      router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  useEffect(() => {
    if (!hasSubcategories || loading) return
    const raw = searchParams.get('subcategory')?.trim()
    if (!raw) return
    const valid = subcategoryOptions.some(
      (name) => name.toLowerCase() === raw.toLowerCase()
    )
    if (!valid) {
      const basePath = catalogFilterBasePath(pathname)
      const params = new URLSearchParams(
        isCatalogFilterPath(pathname) ? searchParams.toString() : ''
      )
      params.delete('subcategory')
      const qs = params.toString()
      router.replace(qs ? `${basePath}?${qs}` : basePath)
    }
  }, [
    hasSubcategories,
    loading,
    pathname,
    router,
    searchParams,
    subcategoryOptions,
  ])

  return {
    selectedSubcategory,
    setSelectedSubcategory,
    subcategoryOptions,
    hasSubcategories,
    loadingSubcategories: loading,
  }
}
