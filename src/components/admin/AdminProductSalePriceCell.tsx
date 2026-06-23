'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import PricelistAmountControls from '@/components/pricelist/PricelistAmountControls'
import { formatPrice, isZeroPrice } from '@/lib/format-price'
import { parsePriceInput, priceInputSeed } from '@/lib/price-input'
import { useI18n } from '@/lib/i18n-context'
import { formatMessage } from '@/lib/i18n'
import { appPath } from '@/lib/paths'

type Props = {
  productId: string
  productName: string
  price: number
  isDark: boolean
  isSuperAdmin: boolean
  authHeaders: Record<string, string>
  onSaved: (productId: string, price: number) => void
}

export default function AdminProductSalePriceCell({
  productId,
  productName,
  price,
  isDark,
  isSuperAdmin,
  authHeaders,
  onSaved,
}: Props) {
  const { t: tr } = useI18n()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(() => priceInputSeed(price))
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const savedValueRef = useRef(priceInputSeed(price))

  useEffect(() => {
    const seed = priceInputSeed(price)
    setValue(seed)
    savedValueRef.current = seed
    if (!isZeroPrice(price)) setEditing(true)
  }, [price])

  const muted = isDark ? 'text-gray-400' : 'text-gray-500'

  const inputClass = `w-full min-w-[4.5rem] pl-7 pr-2 py-1 rounded border text-sm tabular-nums ${
    isDark ? 'bg-dark-900 border-dark-600 text-white' : 'bg-white border-gray-300 text-gray-900'
  }`

  const currentParsed = parsePriceInput(value.trim())
  const savedParsed = parsePriceInput(savedValueRef.current.trim())
  const inputFilled = currentParsed !== null && currentParsed > 0
  const checkSaved =
    savedFlash ||
    (savedParsed !== null && savedParsed > 0 && currentParsed !== null && currentParsed === savedParsed)

  const checkButtonClass = checkSaved
    ? 'shrink-0 inline-flex items-center justify-center rounded-md p-1 border border-green-500 bg-green-500/15 text-green-600 dark:border-green-500/60 dark:bg-green-500/20 dark:text-green-400 transition-colors disabled:opacity-40'
    : `shrink-0 inline-flex items-center justify-center rounded-md p-1 border transition-colors disabled:opacity-40 ${
        isDark
          ? 'border-dark-600 bg-dark-800 text-gray-300 hover:bg-dark-700'
          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
      }`

  const priceInputClass = inputFilled
    ? `w-full min-w-[4.5rem] pl-7 pr-2 py-1 rounded border text-sm tabular-nums font-semibold ${
        isDark
          ? 'bg-dark-900 border-green-500/60 text-green-400'
          : 'bg-white border-green-500 text-green-700'
      }`
    : inputClass

  const priceCurrencyClass = inputFilled
    ? 'pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium text-green-600 dark:text-green-400'
    : `pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs ${muted}`

  const handleSave = useCallback(async () => {
    const parsed = parsePriceInput(value)
    if (parsed == null || parsed <= 0) return

    const previousSaved = parsePriceInput(savedValueRef.current)
    if (previousSaved !== null && previousSaved === parsed) return

    setSaving(true)
    try {
      const res = await fetch(appPath(`/api/admin/products/${productId}/sale-price`), {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: parsed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to save price')
      }

      const nextPrice = Number(data.price)
      const normalized = Number.isFinite(nextPrice) && nextPrice > 0 ? nextPrice : parsed
      const seed = priceInputSeed(normalized)
      savedValueRef.current = seed
      setValue(seed)
      setEditing(true)
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 1200)
      onSaved(productId, normalized)
    } finally {
      setSaving(false)
    }
  }, [authHeaders, onSaved, productId, value])

  if (!isSuperAdmin) {
    if (isZeroPrice(price)) {
      return <span className={muted}>{tr('product.priceOnRequest')}</span>
    }
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded border text-xs tabular-nums font-semibold whitespace-nowrap ${
          isDark
            ? 'bg-dark-900 border-green-500/60 text-green-400'
            : 'bg-white border-green-500 text-green-700'
        }`}
      >
        {formatPrice(price)}
      </span>
    )
  }

  if (isZeroPrice(price) && !editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`text-left text-xs underline-offset-2 hover:underline ${
          isDark ? 'text-gray-300 hover:text-white' : 'text-gray-800 hover:text-gray-950'
        }`}
      >
        {tr('product.priceOnRequest')}
      </button>
    )
  }

  return (
    <PricelistAmountControls
      value={value}
      onChange={setValue}
      saving={saving}
      onSave={handleSave}
      checkButtonClass={checkButtonClass}
      inputClass={priceInputClass}
      currencyClass={priceCurrencyClass}
      currencySymbol="€"
      placeholder="0"
      saveLabel={tr('pricelist.savePrice')}
      saveForLabel={formatMessage(tr('pricelist.savePriceFor'), { name: productName })}
    />
  )
}
