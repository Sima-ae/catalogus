'use client'

import { useI18n } from '@/lib/i18n-context'

type Props = {
  active: boolean
  count: number
  onToggle: () => void
  /** Match CatalogPagination compact nav buttons */
  className?: string
}

export default function PricelistMissingPricesButton({
  active,
  count,
  onToggle,
  className = 'btn-secondary text-xs px-2.5 py-1',
}: Props) {
  const { t } = useI18n()

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!active && count === 0}
      aria-pressed={active}
      className={`${className} whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
        active ? 'ring-1 ring-primary-500/50' : ''
      }`}
    >
      {active
        ? t('pricelist.filter.showAllProducts')
        : t('pricelist.filter.showMissingPrices', { count })}
    </button>
  )
}
