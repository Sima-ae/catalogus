'use client'

import { CheckIcon } from '@heroicons/react/24/outline'
import type { PricelistStockStatus } from '@/lib/pricelist-stock-status'
import { pricelistStockStatusLabel } from '@/lib/pricelist-stock-status'

type Props = {
  value: string
  onChange: (value: string) => void
  stockStatus: PricelistStockStatus | null
  onStockStatusChange: (next: PricelistStockStatus | null) => void
  saving: boolean
  onSave: () => void
  onSetStockStatus: (status: PricelistStockStatus) => void
  checkButtonClass: string
  priceInputClass: string
  priceCurrencyClass: string
  currencySymbol: string
  placeholder: string
  savePriceLabel: string
  savePriceForLabel: string
  stockStatusAria: string
  stockStatusSetPriceLabel: string
  outOfStockLabel: string
  temporarilyOutOfStockLabel: string
  t: (key: string) => string
  isDark: boolean
}

export default function PricelistPriceControls({
  value,
  onChange,
  stockStatus,
  onStockStatusChange,
  saving,
  onSave,
  onSetStockStatus,
  checkButtonClass,
  priceInputClass,
  priceCurrencyClass,
  currencySymbol,
  placeholder,
  savePriceLabel,
  savePriceForLabel,
  stockStatusAria,
  stockStatusSetPriceLabel,
  outOfStockLabel,
  temporarilyOutOfStockLabel,
  t,
  isDark,
}: Props) {
  const hasStockStatus = stockStatus != null
  const statusLabel = pricelistStockStatusLabel(stockStatus, t)

  const outOfStockInputClass = `w-full min-w-[7.5rem] pl-7 pr-2 py-1 rounded border text-sm font-semibold ${
    isDark
      ? 'bg-dark-900 border-red-500/60 text-red-400'
      : 'bg-white border-red-500 text-red-600'
  }`

  const outOfStockCurrencyClass =
    'pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium text-red-600 dark:text-red-400'

  const selectClass = hasStockStatus
    ? `shrink-0 min-w-[6.5rem] max-w-[11rem] rounded-md border py-1 pl-1.5 pr-6 text-xs font-medium leading-tight ${
        isDark
          ? 'border-red-500/60 bg-red-500/15 text-red-400'
          : 'border-red-500 bg-red-500/10 text-red-600'
      }`
    : `shrink-0 min-w-[6.5rem] max-w-[11rem] rounded-md border py-1 pl-1.5 pr-6 text-xs leading-tight ${
        isDark
          ? 'border-dark-600 bg-dark-800 text-gray-300'
          : 'border-gray-300 bg-white text-gray-700'
      }`

  const handleStockSelect = (next: string) => {
    if (next === '') {
      onStockStatusChange(null)
      return
    }
    if (next !== 'out' && next !== 'temporary') return
    void onSetStockStatus(next)
  }

  return (
    <div className="flex items-center gap-1">
      <div className="relative flex-1 min-w-0">
        <span className={hasStockStatus ? outOfStockCurrencyClass : priceCurrencyClass} aria-hidden>
          {currencySymbol}
        </span>
        <input
          type="text"
          inputMode={hasStockStatus ? undefined : 'decimal'}
          readOnly={hasStockStatus}
          value={hasStockStatus ? statusLabel : value}
          onChange={(e) => {
            if (hasStockStatus) return
            onChange(e.target.value)
          }}
          onFocus={() => {
            if (hasStockStatus) onStockStatusChange(null)
          }}
          onBlur={() => void onSave()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void onSave()
            }
          }}
          placeholder={placeholder}
          className={hasStockStatus ? outOfStockInputClass : priceInputClass}
          aria-label={savePriceForLabel}
        />
      </div>
      <button
        type="button"
        onClick={() => void onSave()}
        disabled={saving || (!hasStockStatus && !value.trim())}
        className={checkButtonClass}
        title={savePriceLabel}
        aria-label={savePriceLabel}
      >
        {saving ? (
          <span className="text-xs px-0.5">…</span>
        ) : (
          <CheckIcon className="w-4 h-4" aria-hidden />
        )}
      </button>
      <select
        value={stockStatus ?? ''}
        disabled={saving}
        onChange={(e) => handleStockSelect(e.target.value)}
        className={selectClass}
        aria-label={stockStatusAria}
        title={stockStatusAria}
      >
        <option value="">{stockStatusSetPriceLabel}</option>
        <option value="out">{outOfStockLabel}</option>
        <option value="temporary">{temporarilyOutOfStockLabel}</option>
      </select>
    </div>
  )
}
