'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CheckIcon } from '@heroicons/react/24/outline'
import type { PricelistRow } from '@/lib/pricelist-db'
import { formatPrice } from '@/lib/format-price'
import { useShopCurrency } from '@/lib/shop-currency-context'
import { appPath } from '@/lib/paths'
import PricelistProductThumb from '@/components/pricelist/PricelistProductThumb'
import PricelistStarButton from '@/components/pricelist/PricelistStarButton'

type Props = {
  items: PricelistRow[]
  canEditPrices: boolean
  canManageItems: boolean
  showStar: boolean
  ownerQuery?: string
  isDark: boolean
  onSavePrice: (productId: string, price: number) => Promise<void>
  onRemove: (productId: string) => Promise<void>
  onStarChange?: () => void
}

function editablePriceSeed(row: PricelistRow): string {
  const raw = row.seller_unit_price ?? row.display_unit_price
  if (raw == null || !Number.isFinite(Number(raw))) return ''
  return String(raw)
}

function parsePriceInput(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = parseFloat(trimmed.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

export default function PricelistTable({
  items,
  canEditPrices,
  canManageItems,
  showStar,
  ownerQuery,
  isDark,
  onSavePrice,
  onRemove,
  onStarChange,
}: Props) {
  const border = isDark ? 'border-dark-700' : 'border-gray-200'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'
  const head = isDark ? 'bg-dark-800 text-gray-300' : 'bg-gray-50 text-gray-700'

  return (
    <div className={`overflow-x-auto rounded-xl border ${border}`}>
      <table className="w-full min-w-[640px] text-sm">
        <thead className={head}>
          <tr>
            <th className="px-4 py-3 text-left font-semibold w-20">Image</th>
            <th className="px-4 py-3 text-left font-semibold">Title</th>
            <th className="px-4 py-3 text-left font-semibold w-32">SKU</th>
            <th className="px-4 py-3 text-left font-semibold w-52">Price</th>
            {showStar ? <th className="px-4 py-3 w-12" aria-label="Pricelist" /> : null}
            {canManageItems ? <th className="px-4 py-3 w-24" /> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <PricelistTableRow
              key={`${row.item_id}-${row.seller_unit_price ?? 'x'}`}
              row={row}
              canEditPrices={canEditPrices}
              canManageItems={canManageItems}
              showStar={showStar}
              ownerQuery={ownerQuery}
              isDark={isDark}
              muted={muted}
              border={border}
              onSavePrice={onSavePrice}
              onRemove={onRemove}
              onStarChange={onStarChange}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PricelistTableRow({
  row,
  canEditPrices,
  canManageItems,
  showStar,
  ownerQuery,
  isDark,
  muted,
  border,
  onSavePrice,
  onRemove,
  onStarChange,
}: {
  row: PricelistRow
  canEditPrices: boolean
  canManageItems: boolean
  showStar: boolean
  ownerQuery?: string
  isDark: boolean
  muted: string
  border: string
  onSavePrice: (productId: string, price: number) => Promise<void>
  onRemove: (productId: string) => Promise<void>
  onStarChange?: () => void
}) {
  const { symbol: currencySymbol } = useShopCurrency()
  const savedValueRef = useRef(editablePriceSeed(row))
  const [value, setValue] = useState(() => editablePriceSeed(row))
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const next = editablePriceSeed(row)
    savedValueRef.current = next
    setValue(next)
    setError(null)
  }, [row.product_id, row.seller_unit_price, row.display_unit_price])

  const displayPrice =
    row.display_unit_price != null
      ? formatPrice(row.display_unit_price, { currencyCode: row.display_currency || 'EUR' })
      : '—'

  const handleSave = useCallback(async () => {
    const parsed = parsePriceInput(value)
    if (parsed === null) {
      if (value.trim()) setError('Invalid price')
      return
    }
    const savedParsed = parsePriceInput(savedValueRef.current)
    if (savedParsed !== null && parsed === savedParsed) return
    setSaving(true)
    setError(null)
    try {
      await onSavePrice(row.product_id, parsed)
      savedValueRef.current = String(parsed)
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [onSavePrice, row.product_id, value])

  const inputClass = `w-full min-w-[4.5rem] pl-7 pr-2 py-1.5 rounded border text-sm tabular-nums ${
    isDark ? 'bg-dark-900 border-dark-600 text-white' : 'bg-white border-gray-300 text-gray-900'
  }`

  return (
    <tr className={`border-t ${border} ${isDark ? 'hover:bg-dark-800/50' : 'hover:bg-gray-50'}`}>
      <td className="px-4 py-3">
        <PricelistProductThumb
          productId={row.product_id}
          imageUrl={row.image_url}
          alt={row.name}
        />
      </td>
      <td className="px-4 py-3">
        <Link
          href={appPath(`/product/${row.product_id}`)}
          className={`font-medium hover:underline ${isDark ? 'text-white' : 'text-gray-900'}`}
        >
          {row.name}
        </Link>
      </td>
      <td className={`px-4 py-3 font-mono text-xs ${muted}`}>{row.sku}</td>
      <td className="px-4 py-3">
        {canEditPrices ? (
          <div className="flex flex-col gap-1 max-w-[12rem]">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1 min-w-0">
                <span
                  className={`pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs ${muted}`}
                  aria-hidden
                >
                  {currencySymbol}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value)
                    setError(null)
                  }}
                  onBlur={() => void handleSave()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void handleSave()
                    }
                  }}
                  placeholder="0.00"
                  className={inputClass}
                  aria-label={`Price for ${row.name}`}
                />
              </div>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !value.trim()}
                className={`shrink-0 inline-flex items-center justify-center rounded-md p-1.5 border transition-colors disabled:opacity-40 ${
                  savedFlash
                    ? 'border-green-500/50 bg-green-500/10 text-green-600'
                    : isDark
                      ? 'border-dark-600 bg-dark-800 text-gray-300 hover:bg-dark-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="Save price"
                aria-label="Save price"
              >
                {saving ? (
                  <span className="text-xs px-0.5">…</span>
                ) : (
                  <CheckIcon className="w-4 h-4" aria-hidden />
                )}
              </button>
            </div>
            {error ? <span className="text-xs text-red-500">{error}</span> : null}
          </div>
        ) : (
          <span className={isDark ? 'text-white' : 'text-gray-900'}>{displayPrice}</span>
        )}
      </td>
      {showStar ? (
        <td className="px-4 py-3">
          <PricelistStarButton
            productId={row.product_id}
            size="sm"
            variant="inline"
            ownerQuery={ownerQuery}
            assumedOnList
            onListChange={(onList) => {
              if (!onList) onStarChange?.()
            }}
          />
        </td>
      ) : null}
      {canManageItems ? (
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => onRemove(row.product_id)}
            className={`text-xs ${muted} hover:text-red-500`}
          >
            Remove
          </button>
        </td>
      ) : null}
    </tr>
  )
}
