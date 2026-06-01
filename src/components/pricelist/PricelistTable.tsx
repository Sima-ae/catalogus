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
  isSeller?: boolean
  canApprovePriceEdits?: boolean
  canClearPrice?: boolean
  onSavePrice: (productId: string, price: number, priceSellerId?: string) => Promise<void>
  onClearPrice?: (productId: string, priceSellerId?: string) => Promise<void>
  onRequestPriceEdit?: (productId: string) => Promise<void>
  onApprovePriceEdit?: (requestId: string) => Promise<void>
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
  isSeller = false,
  canApprovePriceEdits = false,
  canClearPrice = false,
  onSavePrice,
  onClearPrice,
  onRequestPriceEdit,
  onApprovePriceEdit,
  onRemove,
  onStarChange,
}: Props) {
  const border = isDark ? 'border-dark-700' : 'border-gray-200'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'
  const head = isDark ? 'bg-dark-800 text-gray-300' : 'bg-gray-50 text-gray-700'

  return (
    <div className={`overflow-x-auto rounded-xl border ${border}`}>
      <table className="w-full min-w-[640px] text-sm table-fixed">
        <colgroup>
          <col className="w-28" />
          <col className="w-[22%]" />
          <col />
          <col className="w-52" />
        </colgroup>
        <thead className={head}>
          <tr>
            <th className="px-3 py-3 text-left font-semibold">Image</th>
            <th className="px-3 py-3 text-left font-semibold">Title</th>
            <th className="px-3 py-3 text-left font-semibold">SKU</th>
            <th className="px-3 py-3 text-left font-semibold">Price</th>
            {showStar ? <th className="px-4 py-3 w-12" aria-label="Pricelist" /> : null}
            {canManageItems ? <th className="px-4 py-3 w-24" /> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <PricelistTableRow
              key={`${row.item_id}-${row.seller_unit_price ?? 'x'}-${row.edit_request_pending ? 'p' : ''}`}
              row={row}
              canEditPrices={canEditPrices}
              canManageItems={canManageItems}
              showStar={showStar}
              ownerQuery={ownerQuery}
              isDark={isDark}
              isSeller={isSeller}
              canApprovePriceEdits={canApprovePriceEdits}
              canClearPrice={canClearPrice}
              muted={muted}
              border={border}
              onSavePrice={onSavePrice}
              onClearPrice={onClearPrice}
              onRequestPriceEdit={onRequestPriceEdit}
              onApprovePriceEdit={onApprovePriceEdit}
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
  isSeller,
  canApprovePriceEdits,
  canClearPrice,
  muted,
  border,
  onSavePrice,
  onClearPrice,
  onRequestPriceEdit,
  onApprovePriceEdit,
  onRemove,
  onStarChange,
}: {
  row: PricelistRow
  canEditPrices: boolean
  canManageItems: boolean
  showStar: boolean
  ownerQuery?: string
  isDark: boolean
  isSeller: boolean
  canApprovePriceEdits: boolean
  canClearPrice: boolean
  muted: string
  border: string
  onSavePrice: (productId: string, price: number, priceSellerId?: string) => Promise<void>
  onClearPrice?: (productId: string, priceSellerId?: string) => Promise<void>
  onRequestPriceEdit?: (productId: string) => Promise<void>
  onApprovePriceEdit?: (requestId: string) => Promise<void>
  onRemove: (productId: string) => Promise<void>
  onStarChange?: () => void
}) {
  const { symbol: currencySymbol } = useShopCurrency()
  const savedValueRef = useRef(editablePriceSeed(row))
  const [value, setValue] = useState(() => editablePriceSeed(row))
  const [saving, setSaving] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showPriceInput = canEditPrices && row.can_edit_price !== false && !isSeller
  const showSellerPriceInput = isSeller && canEditPrices && row.can_edit_price !== false
  const showLockedSellerPrice =
    isSeller && canEditPrices && row.seller_unit_price != null && !showSellerPriceInput
  const sellerPriceDisplay =
    row.seller_unit_price != null
      ? formatPrice(row.seller_unit_price, { currencyCode: row.seller_currency || 'EUR' })
      : '—'

  useEffect(() => {
    const next = editablePriceSeed(row)
    savedValueRef.current = next
    setValue(next)
    setError(null)
  }, [row.product_id, row.seller_unit_price, row.display_unit_price, row.can_edit_price])

  const displayPrice =
    row.display_unit_price != null
      ? formatPrice(row.display_unit_price, { currencyCode: row.display_currency || 'EUR' })
      : '—'

  const handleSave = useCallback(async () => {
    const parsed = parsePriceInput(value)
    if (parsed === null) {
      if (!value.trim()) {
        const hadSaved = savedValueRef.current.trim() !== ''
        if (hadSaved && canClearPrice && onClearPrice) {
          setSaving(true)
          setError(null)
          try {
            await onClearPrice(row.product_id, row.price_seller_id)
            savedValueRef.current = ''
            setValue('')
            setSavedFlash(true)
            window.setTimeout(() => setSavedFlash(false), 1500)
          } catch (e) {
            setValue(savedValueRef.current)
            setError(e instanceof Error ? e.message : 'Clear failed')
          } finally {
            setSaving(false)
          }
        } else if (hadSaved) {
          setValue(savedValueRef.current)
          if (!canClearPrice) {
            setError('Only super admin can clear a price')
            window.setTimeout(() => setError(null), 3000)
          }
        }
        return
      }
      setError('Invalid price')
      return
    }
    const savedParsed = parsePriceInput(savedValueRef.current)
    if (savedParsed !== null && parsed === savedParsed) return
    setSaving(true)
    setError(null)
    try {
      await onSavePrice(row.product_id, parsed, row.price_seller_id)
      savedValueRef.current = String(parsed)
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [canClearPrice, onClearPrice, onSavePrice, row.price_seller_id, row.product_id, value])

  const handleRequestEdit = useCallback(async () => {
    if (!onRequestPriceEdit) return
    setRequesting(true)
    setError(null)
    try {
      await onRequestPriceEdit(row.product_id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setRequesting(false)
    }
  }, [onRequestPriceEdit, row.product_id])

  const handleApprove = useCallback(
    async (requestId: string) => {
      if (!onApprovePriceEdit) return
      setApprovingId(requestId)
      setError(null)
      try {
        await onApprovePriceEdit(requestId)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Approve failed')
      } finally {
        setApprovingId(null)
      }
    },
    [onApprovePriceEdit]
  )

  const inputClass = `w-full min-w-[4.5rem] pl-7 pr-2 py-1.5 rounded border text-sm tabular-nums ${
    isDark ? 'bg-dark-900 border-dark-600 text-white' : 'bg-white border-gray-300 text-gray-900'
  }`

  return (
    <tr className={`border-t ${border} ${isDark ? 'hover:bg-dark-800/50' : 'hover:bg-gray-50'}`}>
      <td className="px-3 py-3">
        <PricelistProductThumb
          productId={row.product_id}
          imageUrl={row.image_url}
          alt={row.name}
          className="relative w-20 h-20 rounded overflow-hidden bg-gray-100"
          sizes="80px"
        />
      </td>
      <td className="px-3 py-3 min-w-0">
        <Link
          href={appPath(`/product/${row.product_id}`)}
          title={row.name}
          className={`block truncate font-medium hover:underline ${isDark ? 'text-white' : 'text-gray-900'}`}
        >
          {row.name}
        </Link>
      </td>
      <td className={`px-3 py-3 font-mono text-xs truncate ${muted}`} title={row.sku}>
        {row.sku}
      </td>
      <td className="px-3 py-3">
        {showSellerPriceInput ? (
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
        ) : showPriceInput ? (
          <div className="flex flex-col gap-1 max-w-[12rem]">
            {canApprovePriceEdits && row.pending_edit_requests?.length ? (
              <div className="flex flex-col gap-0.5 mb-0.5">
                {row.pending_edit_requests.map((req) => (
                  <span
                    key={req.id}
                    className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}
                  >
                    Edit requested by {req.seller_label}
                  </span>
                ))}
              </div>
            ) : null}
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
            {canApprovePriceEdits && row.pending_edit_requests?.length ? (
              <div className="flex flex-wrap gap-1">
                {row.pending_edit_requests.map((req) => (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => void handleApprove(req.id)}
                    disabled={approvingId === req.id}
                    className={`text-xs px-2 py-0.5 rounded border transition-colors disabled:opacity-50 ${
                      isDark
                        ? 'border-primary-500/40 text-primary-300 hover:bg-primary-500/10'
                        : 'border-primary-500/50 text-primary-700 hover:bg-primary-50'
                    }`}
                    title={`Mark edit request from ${req.seller_label} as handled`}
                  >
                    {approvingId === req.id ? 'Saving…' : `Mark handled (${req.seller_label})`}
                  </button>
                ))}
              </div>
            ) : null}
            {error ? <span className="text-xs text-red-500">{error}</span> : null}
          </div>
        ) : showLockedSellerPrice ? (
          <div className="flex flex-col gap-1 max-w-[14rem]">
            <span className={isDark ? 'text-white tabular-nums' : 'text-gray-900 tabular-nums'}>
              {sellerPriceDisplay}
            </span>
            {row.edit_request_pending ? (
              <span className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                Edit requested — admin will update
              </span>
            ) : onRequestPriceEdit ? (
              <button
                type="button"
                onClick={() => void handleRequestEdit()}
                disabled={requesting}
                className={`self-start text-xs px-2 py-0.5 rounded border transition-colors disabled:opacity-50 ${
                  isDark
                    ? 'border-dark-600 text-gray-300 hover:bg-dark-800'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {requesting ? 'Sending…' : 'Request edit'}
              </button>
            ) : null}
            {error ? <span className="text-xs text-red-500">{error}</span> : null}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <span className={isDark ? 'text-white' : 'text-gray-900'}>{displayPrice}</span>
            {error ? <span className="text-xs text-red-500">{error}</span> : null}
          </div>
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
