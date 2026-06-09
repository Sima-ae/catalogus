'use client'

import { useI18n } from '@/lib/i18n-context'
import { formatMessage } from '@/lib/i18n'

type Props = {
  selectedCount: number
  filteredCount: number
  missingCount: number
  allOnPageSelected: boolean
  allFilteredSelected: boolean
  busy?: boolean
  isDark: boolean
  onSelectAllPage: () => void
  onSelectAllFiltered: () => void
  onSelectAllMissing: () => void
  onClearSelection: () => void
  onSetOutOfStock: () => void
  onSetTemporarilyOutOfStock: () => void
  onOpenSetPrice: () => void
  onOpenSetShipping: () => void
}

export default function PricelistBulkActionsBar({
  selectedCount,
  filteredCount,
  missingCount,
  allOnPageSelected,
  allFilteredSelected,
  busy = false,
  isDark,
  onSelectAllPage,
  onSelectAllFiltered,
  onSelectAllMissing,
  onClearSelection,
  onSetOutOfStock,
  onSetTemporarilyOutOfStock,
  onOpenSetPrice,
  onOpenSetShipping,
}: Props) {
  const { t } = useI18n()
  const border = isDark ? 'border-dark-700 bg-dark-900/80' : 'border-gray-200 bg-white'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'
  const selectBtnClass =
    'btn-secondary text-xs px-2.5 py-1 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className={`rounded-xl border px-3 py-3 sm:px-4 space-y-2.5 ${border}`}>
      <div className="flex flex-wrap items-center gap-2">
        {!allOnPageSelected ? (
          <button
            type="button"
            className={selectBtnClass}
            onClick={onSelectAllPage}
            disabled={busy}
          >
            {t('pricelist.bulk.selectAllPage')}
          </button>
        ) : null}
        {!allFilteredSelected && filteredCount > selectedCount ? (
          <button
            type="button"
            className={selectBtnClass}
            onClick={onSelectAllFiltered}
            disabled={busy}
          >
            {formatMessage(t('pricelist.bulk.selectAllFiltered'), { count: filteredCount })}
          </button>
        ) : null}
        {missingCount > 0 ? (
          <button
            type="button"
            className={selectBtnClass}
            onClick={onSelectAllMissing}
            disabled={busy}
          >
            {formatMessage(t('pricelist.bulk.selectAllMissing'), { count: missingCount })}
          </button>
        ) : null}
      </div>

      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200/80 dark:border-dark-700">
          <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {formatMessage(t('pricelist.bulk.selected'), { count: selectedCount })}
          </span>
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={busy}
            onClick={onSetOutOfStock}
          >
            {t('pricelist.bulk.setOutOfStock')}
          </button>
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={busy}
            onClick={onSetTemporarilyOutOfStock}
          >
            {t('pricelist.bulk.setTemporarilyOutOfStock')}
          </button>
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={busy}
            onClick={onOpenSetPrice}
          >
            {t('pricelist.bulk.setPrice')}
          </button>
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={busy}
            onClick={onOpenSetShipping}
          >
            {t('pricelist.bulk.setShipping')}
          </button>
          <button
            type="button"
            className={`text-sm ml-auto hover:underline ${muted}`}
            disabled={busy}
            onClick={onClearSelection}
          >
            {t('pricelist.bulk.clearSelection')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
