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

export type ShopNestedSubcategoryHookValue = {
  selectedNestedSubcategory: string
  setSelectedNestedSubcategory: (nested: string) => void
  nestedSubcategoryOptions: string[]
  hasNestedSubcategories: boolean
  loadingNestedSubcategories: boolean
}

const subcategoryCache = new Map<string, ShopSubcategoryRow[]>()
const subcategoryInflight = new Map<string, Promise<ShopSubcategoryRow[]>>()
const nestedSubcategoryCache = new Map<string, ShopSubcategoryRow[]>()
const nestedSubcategoryInflight = new Map<string, Promise<ShopSubcategoryRow[]>>()

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

async function fetchShopNestedSubcategories(
  selectedCategory: string,
  selectedSubcategory: string
): Promise<ShopSubcategoryRow[]> {
  const key = `${selectedCategory.trim().toLowerCase()}|${selectedSubcategory.trim().toLowerCase()}`
  const cached = nestedSubcategoryCache.get(key)
  if (cached) return cached

  const pending = nestedSubcategoryInflight.get(key)
  if (pending) return pending

  const params = new URLSearchParams({
    category: selectedCategory,
    subcategory: selectedSubcategory,
  })
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
      nestedSubcategoryCache.set(key, filtered)
      return filtered
    })
    .catch(() => [] as ShopSubcategoryRow[])
    .finally(() => {
      nestedSubcategoryInflight.delete(key)
    })

  nestedSubcategoryInflight.set(key, request)
  return request
}

/** Clear client subcategory cache after taxonomy changes. */
export function invalidateShopSubcategoryCache(): void {
  subcategoryCache.clear()
  subcategoryInflight.clear()
  nestedSubcategoryCache.clear()
  nestedSubcategoryInflight.clear()
}

/** Subcategory pills for the current parent category — only rows with products in subtree. */
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
      params.delete('nested')
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
      params.delete('nested')
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

/** Third-level pills under the selected subcategory. */
export function useShopNestedSubcategory(
  selectedCategory: string,
  selectedSubcategory: string
): ShopNestedSubcategoryHookValue {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()

  const enabled =
    Boolean(selectedCategory && selectedCategory !== 'All') &&
    Boolean(selectedSubcategory && selectedSubcategory !== 'All')

  const cacheKey = `${selectedCategory.trim().toLowerCase()}|${selectedSubcategory.trim().toLowerCase()}`
  const cachedRows = enabled ? nestedSubcategoryCache.get(cacheKey) : undefined

  const [nestedSubcategories, setNestedSubcategories] = useState<ShopSubcategoryRow[]>(
    () => cachedRows ?? []
  )
  const [loading, setLoading] = useState(() => enabled && !cachedRows)

  useEffect(() => {
    if (!enabled) {
      setNestedSubcategories([])
      setLoading(false)
      return
    }

    const hit = nestedSubcategoryCache.get(cacheKey)
    if (hit) {
      setNestedSubcategories(hit)
      setLoading(false)
    } else {
      setLoading(true)
    }

    let cancelled = false
    fetchShopNestedSubcategories(selectedCategory, selectedSubcategory)
      .then((rows) => {
        if (!cancelled) setNestedSubcategories(rows)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [cacheKey, enabled, selectedCategory, selectedSubcategory])

  const nestedSubcategoryOptions = useMemo(
    () =>
      sortShopCategoriesByLabel(nestedSubcategories.map((row) => row.name), t, locale),
    [nestedSubcategories, t, locale]
  )

  const hasNestedSubcategories = nestedSubcategoryOptions.length > 0

  const selectedNestedSubcategory = useMemo(() => {
    const raw = searchParams.get('nested')?.trim()
    if (raw) {
      const match = nestedSubcategoryOptions.find(
        (name) => name.toLowerCase() === raw.toLowerCase()
      )
      if (match) return match
    }
    if (!hasNestedSubcategories) return 'All'
    return 'All'
  }, [searchParams, nestedSubcategoryOptions, hasNestedSubcategories])

  const setSelectedNestedSubcategory = useCallback(
    (nested: string) => {
      const basePath = catalogFilterBasePath(pathname)
      const params = new URLSearchParams(
        isCatalogFilterPath(pathname) ? searchParams.toString() : ''
      )
      clearCatalogPageParam(params)
      clearShopSearchParam(params)
      if (nested === 'All') {
        params.delete('nested')
      } else {
        params.set('nested', nested)
      }
      params.delete('brand')
      const qs = params.toString()
      router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  useEffect(() => {
    if (!hasNestedSubcategories || loading) return
    const raw = searchParams.get('nested')?.trim()
    if (!raw) return
    const valid = nestedSubcategoryOptions.some(
      (name) => name.toLowerCase() === raw.toLowerCase()
    )
    if (!valid) {
      const basePath = catalogFilterBasePath(pathname)
      const params = new URLSearchParams(
        isCatalogFilterPath(pathname) ? searchParams.toString() : ''
      )
      params.delete('nested')
      const qs = params.toString()
      router.replace(qs ? `${basePath}?${qs}` : basePath)
    }
  }, [
    hasNestedSubcategories,
    loading,
    nestedSubcategoryOptions,
    pathname,
    router,
    searchParams,
  ])

  return {
    selectedNestedSubcategory,
    setSelectedNestedSubcategory,
    nestedSubcategoryOptions,
    hasNestedSubcategories,
    loadingNestedSubcategories: loading,
  }
}
