'use client'

import Link from 'next/link'
import { StarIcon } from '@heroicons/react/24/outline'
import { useCallback, useEffect, useState } from 'react'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n-context'
import { formatMessage } from '@/lib/i18n'
import { getTopCategoryLabel } from '@/lib/i18n-categories'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'
import { appPath } from '@/lib/paths'
import { PRICELIST_OWNER_QUERY_PLATFORM } from '@/lib/pricelist-constants'
import { useAdminPricelistTargetSlug } from '@/components/admin/PricelistTargetSelector'
import type { AuthUser } from '@/lib/auth-local'

type Props = {
  user: AuthUser
  isDark: boolean
  selectedCategory: string
  selectedSubcategory: string
  selectedBrand: string
  brandFilterActive: boolean
  categoryProductCount: number | null
  brandProductCount: number | null
}

export default function ShopPricelistBulkAddBar({
  user,
  isDark,
  selectedCategory,
  selectedSubcategory,
  selectedBrand,
  brandFilterActive,
  categoryProductCount,
  brandProductCount,
}: Props) {
  const { t } = useI18n()
  const { theme } = useTheme()
  const dark = isDark ?? theme === 'dark'
  const pricelistTarget = useAdminPricelistTargetSlug()
  const [busy, setBusy] = useState<'category' | 'brand' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const showCategory = selectedCategory !== 'All'
  const showBrand = brandFilterActive && selectedBrand !== 'All'

  useEffect(() => {
    setMessage(null)
    setError(null)
  }, [selectedCategory, selectedSubcategory, selectedBrand])

  const runBulkAdd = useCallback(
    async (scope: 'category' | 'brand') => {
      setBusy(scope)
      setMessage(null)
      setError(null)
      try {
        const res = await fetch(appPath('/api/pricelist/items/bulk-add'), {
          method: 'POST',
          headers: {
            ...catalogAuthHeaders(user),
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            scope,
            ownerId: pricelistTarget || PRICELIST_OWNER_QUERY_PLATFORM,
            category: selectedCategory !== 'All' ? selectedCategory : undefined,
            subcategory:
              selectedSubcategory !== 'All' ? selectedSubcategory : undefined,
            brand: scope === 'brand' ? selectedBrand : undefined,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || t('shop.pricelistBulk.failed'))

        const inserted = Number(data.inserted ?? 0)
        const skipped = Number(data.skipped ?? 0)
        setMessage(
          formatMessage(t('shop.pricelistBulk.done'), {
            inserted,
            skipped,
          })
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : t('shop.pricelistBulk.failed'))
      } finally {
        setBusy(null)
      }
    },
    [selectedBrand, selectedCategory, selectedSubcategory, t, user, pricelistTarget]
  )

  if (!showCategory && !showBrand) return null

  const shell = dark
    ? 'border-dark-700 bg-dark-900/80'
    : 'border-gray-200 bg-white'

  const categoryLabel = getTopCategoryLabel(selectedCategory, t)
  const categoryCountLabel =
    categoryProductCount != null
      ? formatMessage(t('shop.pricelistBulk.addCategory'), {
          category: categoryLabel,
          count: categoryProductCount,
        })
      : formatMessage(t('shop.pricelistBulk.addCategoryShort'), { category: categoryLabel })

  const brandCountLabel =
    brandProductCount != null
      ? formatMessage(t('shop.pricelistBulk.addBrand'), {
          brand: selectedBrand,
          count: brandProductCount,
        })
      : formatMessage(t('shop.pricelistBulk.addBrandShort'), { brand: selectedBrand })

  return (
    <div className={`rounded-xl border px-3 py-3 sm:px-4 mb-4 ${shell}`}>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
            dark ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          <StarIcon className="w-4 h-4" aria-hidden />
          {t('shop.pricelistBulk.label')}
        </span>
        {showCategory ? (
          <button
            type="button"
            className="btn-secondary text-sm inline-flex items-center gap-1.5"
            disabled={busy != null || categoryProductCount === 0}
            onClick={() => void runBulkAdd('category')}
          >
            {busy === 'category' ? t('shop.pricelistBulk.adding') : categoryCountLabel}
          </button>
        ) : null}
        {showBrand ? (
          <button
            type="button"
            className="btn-secondary text-sm inline-flex items-center gap-1.5"
            disabled={busy != null || brandProductCount === 0}
            onClick={() => void runBulkAdd('brand')}
          >
            {busy === 'brand' ? t('shop.pricelistBulk.adding') : brandCountLabel}
          </button>
        ) : null}
        <Link
          href={appPath('/pricelist?owner=platform')}
          className={`text-sm ml-auto hover:underline ${dark ? 'text-gray-300' : 'text-gray-700'}`}
        >
          {t('shop.pricelistBulk.viewPricelist')}
        </Link>
      </div>
      {message ? (
        <p className={`mt-2 text-sm ${dark ? 'text-green-400' : 'text-green-700'}`} role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
