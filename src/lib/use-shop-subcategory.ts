'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { sortShopCategoriesByLabel } from '@/lib/i18n-categories'
import { useI18n } from '@/lib/i18n-context'
import {
  fetchShopCategoryNav,
  getCachedShopCategoryNavSync,
  prefetchShopCategoryNav,
  resolveShopNestedSubcategoriesFromNav,
  resolveShopSubcategoriesFromNav,
} from '@/lib/shop-categories-client'
import type { ShopSubcategoryOption } from '@/lib/products-db'
import {
  catalogFilterBasePath,
  clearCatalogPageParam,
  isCatalogFilterPath,
} from '@/lib/shop-catalog-url'
import { useCatalogRouterReplace } from '@/lib/use-catalog-router'

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
  /** Parent category has subcategories but URL has no ?subcategory= yet. */
  needsSubcategoryPick: boolean
}

export type ShopNestedSubcategoryHookValue = {
  selectedNestedSubcategory: string
  setSelectedNestedSubcategory: (nested: string) => void
  nestedSubcategoryOptions: string[]
  hasNestedSubcategories: boolean
  loadingNestedSubcategories: boolean
  /** Subcategory has nested pills but URL has no ?nested= yet. */
  needsNestedSubcategoryPick: boolean
}

const subcategoryCache = new Map<string, ShopSubcategoryRow[]>()
const subcategoryInflight = new Map<string, Promise<ShopSubcategoryRow[]>>()
const nestedSubcategoryCache = new Map<string, ShopSubcategoryRow[]>()
const nestedSubcategoryInflight = new Map<string, Promise<ShopSubcategoryRow[]>>()

function mapSubcategoryOptions(rows: ShopSubcategoryOption[]): ShopSubcategoryRow[] {
  return rows
    .filter((row) => row?.name && (row.productCount ?? 0) > 0)
    .map((row) => ({
      id: String(row.id ?? row.name),
      name: String(row.name),
      productCount: Number(row.productCount ?? 0),
    }))
}

function resolveSubcategoriesSync(selectedCategory: string): ShopSubcategoryRow[] | null {
  const nav = getCachedShopCategoryNavSync()
  if (!nav.length) return null
  return mapSubcategoryOptions(resolveShopSubcategoriesFromNav(nav, selectedCategory))
}

function resolveNestedSubcategoriesSync(
  selectedCategory: string,
  selectedSubcategory: string
): ShopSubcategoryRow[] | null {
  const nav = getCachedShopCategoryNavSync()
  if (!nav.length) return null
  return mapSubcategoryOptions(
    resolveShopNestedSubcategoriesFromNav(nav, selectedCategory, selectedSubcategory)
  )
}

async function fetchShopSubcategories(selectedCategory: string): Promise<ShopSubcategoryRow[]> {
  const key = selectedCategory.trim().toLowerCase()
  const cached = subcategoryCache.get(key)
  if (cached) return cached

  const pending = subcategoryInflight.get(key)
  if (pending) return pending

  const syncHit = resolveSubcategoriesSync(selectedCategory)
  if (syncHit != null) {
    subcategoryCache.set(key, syncHit)
    return syncHit
  }

  const request = fetchShopCategoryNav()
    .then((nav) => {
      const refined = mapSubcategoryOptions(resolveShopSubcategoriesFromNav(nav, selectedCategory))
      subcategoryCache.set(key, refined)
      return refined
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

  const syncHit = resolveNestedSubcategoriesSync(selectedCategory, selectedSubcategory)
  if (syncHit != null) {
    nestedSubcategoryCache.set(key, syncHit)
    return syncHit
  }

  const request = fetchShopCategoryNav()
    .then((nav) => {
      const refined = mapSubcategoryOptions(
        resolveShopNestedSubcategoriesFromNav(nav, selectedCategory, selectedSubcategory)
      )
      nestedSubcategoryCache.set(key, refined)
      return refined
    })
    .catch(() => [] as ShopSubcategoryRow[])
    .finally(() => {
      nestedSubcategoryInflight.delete(key)
    })

  nestedSubcategoryInflight.set(key, request)
  return request
}

/** Warm subcategory cache on category hover/click. */
export function prefetchShopSubcategories(selectedCategory: string): void {
  if (!selectedCategory || selectedCategory === 'All') return
  prefetchShopCategoryNav()
  void fetchShopSubcategories(selectedCategory)
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
  const { replace } = useCatalogRouterReplace()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()

  const cacheKey = selectedCategory.trim().toLowerCase()
  const cachedRows =
    selectedCategory && selectedCategory !== 'All' ? subcategoryCache.get(cacheKey) : undefined
  const syncRows =
    selectedCategory && selectedCategory !== 'All'
      ? resolveSubcategoriesSync(selectedCategory)
      : null

  const [subcategories, setSubcategories] = useState<ShopSubcategoryRow[]>(
    () => cachedRows ?? syncRows ?? []
  )
  const [loading, setLoading] = useState(
    () =>
      Boolean(
        selectedCategory &&
          selectedCategory !== 'All' &&
          !cachedRows &&
          !syncRows?.length
      )
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
      return
    }

    const instant = resolveSubcategoriesSync(selectedCategory)
    if (instant != null) {
      setSubcategories(instant)
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
      if (raw.toLowerCase() === 'all') return 'All'
      const match = subcategoryOptions.find(
        (name) => name.toLowerCase() === raw.toLowerCase()
      )
      if (match) return match
    }
    if (legacySubcategoryFromCategoryParam) return legacySubcategoryFromCategoryParam
    if (!hasSubcategories) return 'All'
    return ''
  }, [searchParams, subcategoryOptions, hasSubcategories, legacySubcategoryFromCategoryParam])

  const needsSubcategoryPick = useMemo(
    () => hasSubcategories && !loading && selectedSubcategory === '',
    [hasSubcategories, loading, selectedSubcategory]
  )

  const setSelectedSubcategory = useCallback(
    (subcategory: string) => {
      const basePath = catalogFilterBasePath(pathname)
      const params = new URLSearchParams(
        isCatalogFilterPath(pathname) ? searchParams.toString() : ''
      )
      clearCatalogPageParam(params)
      if (subcategory === 'All') {
        params.set('subcategory', 'All')
      } else {
        params.set('subcategory', subcategory)
      }
      params.delete('nested')
      params.delete('brand')
      const qs = params.toString()
      replace(qs ? `${basePath}?${qs}` : basePath)
    },
    [pathname, replace, searchParams]
  )

  useEffect(() => {
    if (!hasSubcategories || loading) return
    const raw = searchParams.get('subcategory')?.trim()
    if (!raw) return
    if (raw.toLowerCase() === 'all') return
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
      replace(qs ? `${basePath}?${qs}` : basePath)
    }
  }, [
    hasSubcategories,
    loading,
    pathname,
    replace,
    searchParams,
    subcategoryOptions,
  ])

  return {
    selectedSubcategory,
    setSelectedSubcategory,
    subcategoryOptions,
    hasSubcategories,
    loadingSubcategories: loading,
    needsSubcategoryPick,
  }
}

/** Third-level pills under the selected subcategory. */
export function useShopNestedSubcategory(
  selectedCategory: string,
  selectedSubcategory: string
): ShopNestedSubcategoryHookValue {
  const { replace } = useCatalogRouterReplace()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()

  const enabled =
    Boolean(selectedCategory && selectedCategory !== 'All') &&
    Boolean(selectedSubcategory && selectedSubcategory !== 'All')

  const cacheKey = `${selectedCategory.trim().toLowerCase()}|${selectedSubcategory.trim().toLowerCase()}`
  const cachedRows = enabled ? nestedSubcategoryCache.get(cacheKey) : undefined
  const syncRows = enabled
    ? resolveNestedSubcategoriesSync(selectedCategory, selectedSubcategory)
    : null

  const [nestedSubcategories, setNestedSubcategories] = useState<ShopSubcategoryRow[]>(
    () => cachedRows ?? syncRows ?? []
  )
  const [loading, setLoading] = useState(
    () => Boolean(enabled && !cachedRows && !syncRows?.length)
  )

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
      return
    }

    const instant = resolveNestedSubcategoriesSync(selectedCategory, selectedSubcategory)
    if (instant != null) {
      setNestedSubcategories(instant)
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
      if (raw.toLowerCase() === 'all') return 'All'
      const match = nestedSubcategoryOptions.find(
        (name) => name.toLowerCase() === raw.toLowerCase()
      )
      if (match) return match
    }
    if (!hasNestedSubcategories) return 'All'
    return ''
  }, [searchParams, nestedSubcategoryOptions, hasNestedSubcategories])

  const needsNestedSubcategoryPick = useMemo(
    () => hasNestedSubcategories && !loading && selectedNestedSubcategory === '',
    [hasNestedSubcategories, loading, selectedNestedSubcategory]
  )

  const setSelectedNestedSubcategory = useCallback(
    (nested: string) => {
      const basePath = catalogFilterBasePath(pathname)
      const params = new URLSearchParams(
        isCatalogFilterPath(pathname) ? searchParams.toString() : ''
      )
      clearCatalogPageParam(params)
      if (nested === 'All') {
        params.set('nested', 'All')
      } else {
        params.set('nested', nested)
      }
      params.delete('brand')
      const qs = params.toString()
      replace(qs ? `${basePath}?${qs}` : basePath)
    },
    [pathname, replace, searchParams]
  )

  /** Skip an extra click when a subcategory has only one nested type (e.g. SPORT → MLB). */
  useEffect(() => {
    if (!enabled || loading || !needsNestedSubcategoryPick) return
    if (nestedSubcategoryOptions.length !== 1) return
    setSelectedNestedSubcategory(nestedSubcategoryOptions[0]!)
  }, [
    enabled,
    loading,
    needsNestedSubcategoryPick,
    nestedSubcategoryOptions,
    setSelectedNestedSubcategory,
  ])

  useEffect(() => {
    if (!hasNestedSubcategories || loading) return
    const raw = searchParams.get('nested')?.trim()
    if (!raw) return
    if (raw.toLowerCase() === 'all') return
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
      replace(qs ? `${basePath}?${qs}` : basePath)
    }
  }, [
    hasNestedSubcategories,
    loading,
    nestedSubcategoryOptions,
    pathname,
    replace,
    searchParams,
  ])

  return {
    selectedNestedSubcategory,
    setSelectedNestedSubcategory,
    nestedSubcategoryOptions,
    hasNestedSubcategories,
    loadingNestedSubcategories: loading,
    needsNestedSubcategoryPick,
  }
}
