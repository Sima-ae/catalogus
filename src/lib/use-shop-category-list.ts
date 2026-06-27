'use client'

import { useEffect, useMemo, useState } from 'react'
import { dedupeShopCategoriesByLabel, sortShopCategoriesByLabel } from '@/lib/i18n-categories'
import { useI18n } from '@/lib/i18n-context'
import { fetchShopCategoryMenu } from '@/lib/shop-categories-client'

/** Top-level category labels for shop sidebar and filters. */
export function useShopCategoryList() {
  const { t, locale } = useI18n()
  const [categories, setCategories] = useState<string[]>(['All'])

  useEffect(() => {
    let cancelled = false
    fetchShopCategoryMenu()
      .then((menu) => {
        if (cancelled) return
        setCategories(menu.length ? menu : ['All'])
      })
      .catch(() => {
        if (!cancelled) setCategories(['All'])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return useMemo(
    () =>
      dedupeShopCategoriesByLabel(
        sortShopCategoriesByLabel(categories, t, locale),
        t,
        locale
      ),
    [categories, t, locale]
  )
}
