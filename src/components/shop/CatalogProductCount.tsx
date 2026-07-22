'use client'

import { useAppTheme } from '@/lib/theme-classes'
import { useI18n } from '@/lib/i18n-context'
import { formatMessage } from '@/lib/i18n'

/** Product / search result count above the catalog grid. */
export default function CatalogProductCount({
  count,
  searchQuery,
  centered = false,
  pending = false,
}: {
  count: number
  searchQuery?: string
  centered?: boolean
  /** True while the exact total is still loading but products are visible. */
  pending?: boolean
}) {
  const t = useAppTheme()
  const { t: tr } = useI18n()
  const query = searchQuery?.trim() ?? ''

  if (!pending && count <= 0 && !query) return null

  let label: string
  if (query) {
    if (pending && count <= 0) {
      label = tr('shop.catalog.searchResultsPending')
    } else if (count === 1) {
      label = formatMessage(tr('shop.catalog.searchResultOne'), { query })
    } else {
      label = formatMessage(tr('shop.catalog.searchResults'), { count, query })
    }
  } else if (count === 1) {
    label = tr('shop.catalog.productCountOne')
  } else {
    label = formatMessage(tr('shop.catalog.productCount'), { count })
  }

  return (
    <p
      className={`text-sm font-medium mb-3 mt-1 ${centered ? 'text-center' : ''} ${t.muted}`}
      aria-live="polite"
    >
      {label}
    </p>
  )
}
