'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { PricelistRow } from '@/lib/pricelist-db'
import { formatPrice } from '@/lib/format-price'
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
            <th className="px-4 py-3 text-left font-semibold w-44">Price</th>
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
  const initial =
    canEditPrices && row.seller_unit_price != null ? String(row.seller_unit_price) : ''
  const [value, setValue] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const displayPrice =
    row.display_unit_price != null
      ? formatPrice(row.display_unit_price, { currencyCode: row.display_currency || 'EUR' })
      : '—'

  const handleSave = async () => {
    const n = parseFloat(value.replace(',', '.'))
    if (!Number.isFinite(n) || n < 0) {
      setError('Invalid price')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSavePrice(row.product_id, Math.round(n * 100) / 100)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

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
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.00"
                className={`w-24 px-2 py-1.5 rounded border text-sm ${
                  isDark
                    ? 'bg-dark-900 border-dark-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary px-3 py-1.5 text-xs whitespace-nowrap disabled:opacity-50"
              >
                {saving ? '…' : 'Save'}
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
