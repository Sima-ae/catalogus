'use client'

import { useEffect, useRef, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n-context'
import { useShopCurrency } from '@/lib/shop-currency-context'

type Props = {
  open: boolean
  count: number
  busy?: boolean
  variant?: 'price' | 'shipping'
  onClose: () => void
  onApply: (amount: number) => void | Promise<void>
}

function parsePriceInput(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = parseFloat(trimmed.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

export default function PricelistBulkPriceModal({
  open,
  count,
  busy = false,
  variant = 'price',
  onClose,
  onApply,
}: Props) {
  const { theme } = useTheme()
  const { t } = useI18n()
  const { symbol: currencySymbol } = useShopCurrency()
  const isDark = theme === 'dark'
  const panelRef = useRef<HTMLDivElement>(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setValue('')
    setError(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  if (!open) return null

  const isShipping = variant === 'shipping'
  const titleKey = isShipping ? 'pricelist.bulk.shippingModalTitle' : 'pricelist.bulk.modalTitle'
  const hintKey = isShipping ? 'pricelist.bulk.shippingModalHint' : 'pricelist.bulk.modalHint'
  const applyKey = isShipping ? 'pricelist.bulk.applyShipping' : 'pricelist.bulk.applyPrice'

  const handleSubmit = async () => {
    const parsed = parsePriceInput(value)
    if (parsed === null) {
      setError(t('pricelist.error.invalidPrice'))
      return
    }
    setError(null)
    await onApply(parsed)
  }

  const inputClass = `w-full pl-8 pr-3 py-2 rounded-lg border text-sm tabular-nums ${
    isDark
      ? 'bg-dark-800 border-dark-600 text-white'
      : 'bg-white border-gray-300 text-gray-900'
  }`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricelist-bulk-price-title"
        className={`w-full max-w-md rounded-xl border shadow-xl p-5 sm:p-6 ${
          isDark ? 'bg-dark-900 border-dark-700' : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2
              id="pricelist-bulk-price-title"
              className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              {t(titleKey)}
            </h2>
            <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {t(hintKey)} ({count})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={`p-1.5 rounded-lg shrink-0 ${
              isDark ? 'hover:bg-dark-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
            aria-label={t('pricelist.bulk.cancel')}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mb-4">
          <span
            className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            {currencySymbol}
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('pricelist.pricePlaceholder')}
            className={inputClass}
            autoFocus
            disabled={busy}
          />
        </div>

        {error ? <p className="text-sm text-red-500 mb-3">{error}</p> : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={onClose}
            disabled={busy}
          >
            {t('pricelist.bulk.cancel')}
          </button>
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={() => void handleSubmit()}
            disabled={busy}
          >
            {busy ? t('pricelist.bulk.working') : t(applyKey)}
          </button>
        </div>
      </div>
    </div>
  )
}
