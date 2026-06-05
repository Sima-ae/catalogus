'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { sortShopCategoriesByLabel } from '@/lib/i18n-categories'
import { useI18n } from '@/lib/i18n-context'
import { appPath } from '@/lib/paths'
import { clearCatalogPageParam, isShopCatalogPath, shopCatalogBasePath } from '@/lib/shop-catalog-url'

export type ShopSubcategoryRow = {
  id: string
  name: string
  productCount: number
}


/** Subcategory pills for the current parent category — only rows with products. */
export function useShopSubcategory(selectedCategory: string) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const selectedBrand = searchParams.get('brand')?.trim() || 'All'

  const [subcategories, setSubcategories] = useState<ShopSubcategoryRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedCategory || selectedCategory === 'All') {
      setSubcategories([])
      return
    }

    let cancelled = false
    setLoading(true)

    const params = new URLSearchParams({ category: selectedCategory })
    if (selectedBrand && selectedBrand !== 'All') {
      params.set('brand', selectedBrand)
    }

    fetch(appPath(`/api/categories/subcategories?${params.toString()}`))
      .then((res) => (res.ok ? res.json() : { subcategories: [] }))
      .then((data: unknown) => {
        if (cancelled) return
        const rows =
          data &&
          typeof data === 'object' &&
          Array.isArray((data as { subcategories?: unknown }).subcategories)
            ? ((data as { subcategories: ShopSubcategoryRow[] }).subcategories ?? [])
            : []
        setSubcategories(
          rows.filter((row) => row?.name) as ShopSubcategoryRow[]
        )
      })
      .catch(() => {
        if (!cancelled) setSubcategories([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedCategory, selectedBrand])

  const subcategoryOptions = useMemo(
    () => sortShopCategoriesByLabel(subcategories.map((row) => row.name), t, locale),
    [subcategories, t, locale]
  )

  const hasSubcategories = subcategoryOptions.length > 0

  const selectedSubcategory = useMemo(() => {
    if (!hasSubcategories) return 'All'
    const raw = searchParams.get('subcategory')?.trim()
    if (!raw) return 'All'
    const match = subcategoryOptions.find(
      (name) => name.toLowerCase() === raw.toLowerCase()
    )
    return match ?? 'All'
  }, [searchParams, subcategoryOptions, hasSubcategories])

  const setSelectedSubcategory = useCallback(
    (subcategory: string) => {
      const basePath = shopCatalogBasePath(pathname)
      const params = new URLSearchParams(
        isShopCatalogPath(pathname) ? searchParams.toString() : ''
      )
      clearCatalogPageParam(params)
      if (subcategory === 'All') {
        params.delete('subcategory')
      } else {
        params.set('subcategory', subcategory)
      }
      params.delete('brand')
      const qs = params.toString()
      router.push(qs ? `${basePath}?${qs}` : basePath)
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
      const basePath = shopCatalogBasePath(pathname)
      const params = new URLSearchParams(
        isShopCatalogPath(pathname) ? searchParams.toString() : ''
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
