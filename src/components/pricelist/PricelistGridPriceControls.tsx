'use client'

import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import {
  pricelistStockStatusLabel,
  type PricelistStockStatus,
} from '@/lib/pricelist-stock-status'

type Props = {
  value: string
  onChange: (value: string) => void
  stockStatus: PricelistStockStatus | null
  onClearStockStatus: () => void
  saving: boolean
  onSave: () => void
  onMarkOutOfStock: () => void
  currencySymbol: string
  placeholder: string
  savePriceLabel: string
  savePriceForLabel: string
  outOfStockLabel: string
  isDark: boolean
  t: (key: string) => string
}

/** Compact price + out-of-stock controls for pricelist grid cards. */
export default function PricelistGridPriceControls({
  value,
  onChange,
  stockStatus,
  onClearStockStatus,
  saving,
  onSave,
  onMarkOutOfStock,
  currencySymbol,
  placeholder,
  savePriceLabel,
  savePriceForLabel,
  outOfStockLabel,
  isDark,
  t,
}: Props) {
  const hasStockStatus = stockStatus != null
  const statusLabel = pricelistStockStatusLabel(stockStatus, t)
  const outOfStockActive = stockStatus === 'out'

  const inputClass = hasStockStatus
    ? `w-full min-w-0 pl-6 pr-2 py-1 rounded-md border text-xs font-semibold ${
        isDark
          ? 'bg-dark-900 border-red-500/60 text-red-400'
          : 'bg-white border-red-500 text-red-600'
      }`
    : `w-full min-w-0 pl-6 pr-2 py-1 rounded-md border text-xs tabular-nums ${
        isDark
          ? 'bg-dark-900 border-dark-600 text-white focus:border-primary-500'
          : 'bg-white border-gray-300 text-gray-900 focus:border-primary-500'
      } focus:outline-none focus:ring-1 focus:ring-primary-500/40`

  const currencyClass = hasStockStatus
    ? 'pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-red-600 dark:text-red-400'
    : `pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-medium ${
        isDark ? 'text-gray-500' : 'text-gray-400'
      }`

  const checkClass = `shrink-0 p-1 rounded-md border transition-colors disabled:opacity-40 ${
    isDark
      ? 'border-dark-600 bg-dark-800 text-gray-200 hover:bg-dark-700'
      : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100'
  }`

  const oosClass = outOfStockActive
    ? `shrink-0 p-1 rounded-md border transition-colors disabled:opacity-40 ${
        isDark
          ? 'border-red-500/70 bg-red-500/20 text-red-400'
          : 'border-red-500 bg-red-50 text-red-600'
      }`
    : `shrink-0 p-1 rounded-md border transition-colors disabled:opacity-40 ${
        isDark
          ? 'border-dark-600 bg-dark-800 text-red-400 hover:bg-red-500/15 hover:border-red-500/50'
          : 'border-gray-300 bg-gray-50 text-red-500 hover:bg-red-50 hover:border-red-400'
      }`

  const handleOutOfStockClick = () => {
    if (saving) return
    if (hasStockStatus) {
      onClearStockStatus()
      return
    }
    void onMarkOutOfStock()
  }

  return (
    <div className="flex items-center gap-1">
      <div className="relative flex-1 min-w-0">
        <span className={currencyClass} aria-hidden>
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
            if (hasStockStatus) onClearStockStatus()
          }}
          onBlur={() => void onSave()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void onSave()
            }
          }}
          placeholder={placeholder}
          className={inputClass}
          aria-label={savePriceForLabel}
        />
      </div>
      <button
        type="button"
        onClick={() => void onSave()}
        disabled={saving || (!hasStockStatus && !value.trim())}
        className={checkClass}
        title={savePriceLabel}
        aria-label={savePriceLabel}
      >
        {saving ? (
          <span className="text-[10px] px-0.5">…</span>
        ) : (
          <CheckIcon className="w-3.5 h-3.5" aria-hidden />
        )}
      </button>
      <button
        type="button"
        onClick={handleOutOfStockClick}
        disabled={saving}
        className={oosClass}
        title={outOfStockLabel}
        aria-label={outOfStockLabel}
        aria-pressed={outOfStockActive}
      >
        <XMarkIcon className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  )
}
