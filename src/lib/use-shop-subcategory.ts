'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { appPath, isAppPath } from '@/lib/paths'

const CATALOG_PATHS = ['/', '/new']

export type ShopSubcategoryRow = {
  id: string
  name: string
  productCount: number
}

function isCatalogPath(pathname: string | null) {
  if (!pathname) return false
  return CATALOG_PATHS.some((p) => isAppPath(pathname, p) || pathname === p)
}

/** Subcategory pills for the current parent category — only rows with products. */
export function useShopSubcategory(selectedCategory: string) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
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
          rows.filter(
            (row) => row?.name && Number(row.productCount) > 0
          ) as ShopSubcategoryRow[]
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
    () => subcategories.map((row) => row.name),
    [subcategories]
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
      const basePath = isCatalogPath(pathname) ? pathname!.split('?')[0] : appPath('/')
      const params = new URLSearchParams(
        isCatalogPath(pathname) ? searchParams.toString() : ''
      )
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
      const basePath = isCatalogPath(pathname) ? pathname!.split('?')[0] : appPath('/')
      const params = new URLSearchParams(
        isCatalogPath(pathname) ? searchParams.toString() : ''
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
