'use client'

import { useI18n } from '@/lib/i18n-context'

type Props = {
  active: boolean
  count?: number
  onToggle: () => void
  inactiveLabelKey: string
  /** Match CatalogPagination compact nav buttons */
  className?: string
  disabled?: boolean
}

export default function PricelistFilterToggleButton({
  active,
  count = 0,
  onToggle,
  inactiveLabelKey,
  className = 'btn-secondary text-xs px-2.5 py-1',
  disabled = false,
}: Props) {
  const { t } = useI18n()

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled || (!active && count === 0)}
      aria-pressed={active}
      className={`${className} whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
        active ? 'ring-1 ring-primary-500/50' : ''
      }`}
    >
      {active
        ? t('pricelist.filter.showAllProducts')
        : t(inactiveLabelKey, { count })}
    </button>
  )
}
