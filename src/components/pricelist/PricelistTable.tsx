'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TrashIcon } from '@heroicons/react/24/outline'
import PricelistPriceControls from '@/components/pricelist/PricelistPriceControls'
import {
  pricelistStockStatusLabel,
  type PricelistStockStatus,
} from '@/lib/pricelist-stock-status'
import type { PricelistRow } from '@/lib/pricelist-db'
import { formatPrice } from '@/lib/format-price'
import { useShopCurrency } from '@/lib/shop-currency-context'
import PricelistProductThumb from '@/components/pricelist/PricelistProductThumb'
import PricelistStarButton from '@/components/pricelist/PricelistStarButton'
import { useI18n } from '@/lib/i18n-context'
import { getTopCategoryLabel } from '@/lib/i18n-categories'
import { isPricelistRowBulkEditable } from '@/lib/pricelist-filters'

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
  onSetStockStatus?: (
    productId: string,
    stockStatus: PricelistStockStatus,
    priceSellerId?: string
  ) => Promise<void>
  onClearPrice?: (productId: string, priceSellerId?: string) => Promise<void>
  onRequestPriceEdit?: (productId: string) => Promise<void>
  onApprovePriceEdit?: (requestId: string) => Promise<void>
  onRemove: (productId: string) => Promise<void>
  onStarChange?: () => void
  onOpenGallery?: (row: PricelistRow) => void
  enableBulkSelect?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (productId: string) => void
  onToggleSelectAllPage?: () => void
  allOnPageSelected?: boolean
  someOnPageSelected?: boolean
}

function rowStockStatus(row: PricelistRow): PricelistStockStatus | null {
  const price = row.seller_unit_price ?? row.display_unit_price
  if (price != null && Number(price) > 0) return null
  return row.seller_stock_status ?? row.display_stock_status ?? null
}

function editablePriceSeed(row: PricelistRow): string {
  if (rowStockStatus(row)) return ''
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
  onSetStockStatus,
  onClearPrice,
  onRequestPriceEdit,
  onApprovePriceEdit,
  onRemove,
  onStarChange,
  onOpenGallery,
  enableBulkSelect = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAllPage,
  allOnPageSelected = false,
  someOnPageSelected = false,
}: Props) {
  const { t } = useI18n()
  const border = isDark ? 'border-dark-700' : 'border-gray-200'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'
  const head = isDark ? 'bg-dark-800 text-gray-300' : 'bg-gray-50 text-gray-700'

  return (
    <div className={`w-full overflow-x-auto rounded-xl border ${border}`}>
      <table className="w-full min-w-[1080px] text-sm table-fixed">
        <colgroup>
          {enableBulkSelect ? <col className="w-10" /> : null}
          <col className="w-[5.5rem]" />
          <col className="w-[9%]" />
          <col className="w-[22%]" />
          <col className="w-[11%]" />
          <col className="w-[14%]" />
          <col className={canManageItems || showStar ? 'w-[34%]' : 'w-[36%]'} />
          {showStar ? <col className="w-10" /> : null}
          {canManageItems ? <col className="w-10" /> : null}
        </colgroup>
        <thead className={head}>
          <tr>
            {enableBulkSelect ? (
              <th className="px-2 py-2 w-10 align-middle">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 dark:border-dark-600"
                  checked={allOnPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected
                  }}
                  onChange={() => onToggleSelectAllPage?.()}
                  aria-label={t('pricelist.bulk.selectAllPage')}
                />
              </th>
            ) : null}
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
              {t('pricelist.col.image')}
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
              {t('pricelist.col.title')}
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
              {t('pricelist.col.sku')}
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
              {t('pricelist.col.category')}
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
              {t('pricelist.col.brand')}
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
              {t('pricelist.col.price')}
            </th>
            {showStar ? (
              <th className="px-3 py-2 w-12" aria-label={t('pricelist.col.starAria')} />
            ) : null}
            {canManageItems ? (
              <th className="px-1 py-2 w-10" aria-label={t('pricelist.remove')} />
            ) : null}
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
              onSetStockStatus={onSetStockStatus}
              onClearPrice={onClearPrice}
              onRequestPriceEdit={onRequestPriceEdit}
              onApprovePriceEdit={onApprovePriceEdit}
              onRemove={onRemove}
              onStarChange={onStarChange}
              onOpenGallery={onOpenGallery}
              enableBulkSelect={enableBulkSelect}
              selected={selectedIds?.has(row.product_id) ?? false}
              onToggleSelect={onToggleSelect}
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
  onSetStockStatus,
  onClearPrice,
  onRequestPriceEdit,
  onApprovePriceEdit,
  onRemove,
  onStarChange,
  onOpenGallery,
  enableBulkSelect = false,
  selected = false,
  onToggleSelect,
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
  onSetStockStatus?: (
    productId: string,
    stockStatus: PricelistStockStatus,
    priceSellerId?: string
  ) => Promise<void>
  onClearPrice?: (productId: string, priceSellerId?: string) => Promise<void>
  onRequestPriceEdit?: (productId: string) => Promise<void>
  onApprovePriceEdit?: (requestId: string) => Promise<void>
  onRemove: (productId: string) => Promise<void>
  onStarChange?: () => void
  onOpenGallery?: (row: PricelistRow) => void
  enableBulkSelect?: boolean
  selected?: boolean
  onToggleSelect?: (productId: string) => void
}) {
  const { t } = useI18n()
  const { symbol: currencySymbol } = useShopCurrency()
  const savedValueRef = useRef(editablePriceSeed(row))
  const [value, setValue] = useState(() => editablePriceSeed(row))
  const [stockStatus, setStockStatus] = useState<PricelistStockStatus | null>(() =>
    rowStockStatus(row)
  )
  const [saving, setSaving] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bulkEditable = isPricelistRowBulkEditable(row, { isSeller })
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
    setStockStatus(rowStockStatus(row))
    setError(null)
  }, [
    row.product_id,
    row.seller_unit_price,
    row.display_unit_price,
    row.seller_stock_status,
    row.display_stock_status,
    row.can_edit_price,
  ])

  const displayPrice = row.display_stock_status
    ? null
    : row.display_unit_price != null
      ? formatPrice(row.display_unit_price, { currencyCode: row.display_currency || 'EUR' })
      : null

  const priceControlLabels = {
    placeholder: t('pricelist.pricePlaceholder'),
    savePriceLabel: t('pricelist.savePrice'),
    savePriceForLabel: t('pricelist.savePriceFor', { name: row.name }),
    stockStatusAria: t('pricelist.stockStatusAria'),
    stockStatusSetPriceLabel: t('pricelist.stockStatusSetPrice'),
    outOfStockLabel: t('pricelist.outOfStock'),
    temporarilyOutOfStockLabel: t('pricelist.temporarilyOutOfStock'),
  }

  const handleSetStockStatus = useCallback(
    async (status: PricelistStockStatus) => {
      if (!onSetStockStatus) return
      setSaving(true)
      setError(null)
      try {
        await onSetStockStatus(row.product_id, status, row.price_seller_id)
        setStockStatus(status)
        setValue('')
        savedValueRef.current = ''
        setSavedFlash(true)
        window.setTimeout(() => setSavedFlash(false), 1500)
      } catch (e) {
        setError(e instanceof Error ? e.message : t('pricelist.error.saveFailed'))
      } finally {
        setSaving(false)
      }
    },
    [onSetStockStatus, row.price_seller_id, row.product_id, t]
  )

  const handleSave = useCallback(async () => {
    if (stockStatus) return
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
            setError(e instanceof Error ? e.message : t('pricelist.error.clearFailed'))
          } finally {
            setSaving(false)
          }
        } else if (hadSaved) {
          setValue(savedValueRef.current)
          if (!canClearPrice) {
            setError(t('pricelist.error.onlySuperAdminClear'))
            window.setTimeout(() => setError(null), 3000)
          }
        }
        return
      }
      setError(t('pricelist.error.invalidPrice'))
      return
    }
    const savedParsed = parsePriceInput(savedValueRef.current)
    if (savedParsed !== null && parsed === savedParsed) return
    setSaving(true)
    setError(null)
    try {
      await onSavePrice(row.product_id, parsed, row.price_seller_id)
      const savedText = String(parsed)
      savedValueRef.current = savedText
      setValue(savedText)
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('pricelist.error.saveFailed'))
    } finally {
      setSaving(false)
    }
  }, [canClearPrice, onClearPrice, onSavePrice, stockStatus, row.price_seller_id, row.product_id, value, t])

  const handleRequestEdit = useCallback(async () => {
    if (!onRequestPriceEdit) return
    setRequesting(true)
    setError(null)
    try {
      await onRequestPriceEdit(row.product_id)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('pricelist.error.requestFailed'))
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
        setError(e instanceof Error ? e.message : t('pricelist.error.approveFailed'))
      } finally {
        setApprovingId(null)
      }
    },
    [onApprovePriceEdit]
  )

  const inputClass = `w-full min-w-[4.5rem] pl-7 pr-2 py-1 rounded border text-sm tabular-nums ${
    isDark ? 'bg-dark-900 border-dark-600 text-white' : 'bg-white border-gray-300 text-gray-900'
  }`

  const currentParsed = parsePriceInput(value.trim())
  const savedParsed = parsePriceInput(savedValueRef.current.trim())
  const inputFilled = currentParsed !== null
  const checkSaved =
    savedFlash ||
    (savedParsed !== null && currentParsed !== null && currentParsed === savedParsed)

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

  const checkButtonClass = checkSaved
    ? 'shrink-0 inline-flex items-center justify-center rounded-md p-1 border border-green-500 bg-green-500/15 text-green-600 dark:border-green-500/60 dark:bg-green-500/20 dark:text-green-400 transition-colors disabled:opacity-40'
    : `shrink-0 inline-flex items-center justify-center rounded-md p-1 border transition-colors disabled:opacity-40 ${
        isDark
          ? 'border-dark-600 bg-dark-800 text-gray-300 hover:bg-dark-700'
          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
      }`

  return (
    <tr className={`border-t ${border} ${isDark ? 'hover:bg-dark-800/50' : 'hover:bg-gray-50'}`}>
      {enableBulkSelect ? (
        <td className="px-2 py-1.5 align-middle w-10">
          {bulkEditable ? (
            <input
              type="checkbox"
              className="rounded border-gray-300 dark:border-dark-600"
              checked={selected}
              onChange={() => onToggleSelect?.(row.product_id)}
              aria-label={row.name}
            />
          ) : null}
        </td>
      ) : null}
      <td className="px-3 py-1 align-middle">
        <PricelistProductThumb
          imageUrl={row.image_url}
          alt={row.name}
          className="relative w-20 h-20 rounded overflow-hidden bg-gray-100"
          sizes="80px"
          onOpenGallery={onOpenGallery ? () => onOpenGallery(row) : undefined}
        />
      </td>
      <td className="px-3 py-1.5 min-w-0 align-middle">
        {onOpenGallery ? (
          <button
            type="button"
            onClick={() => onOpenGallery(row)}
            title={row.name}
            className={`block w-full truncate text-left font-medium leading-snug hover:underline cursor-zoom-in ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {row.name}
          </button>
        ) : (
          <span
            title={row.name}
            className={`block truncate font-medium leading-snug ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            {row.name}
          </span>
        )}
      </td>
      <td
        className={`px-3 py-1.5 font-mono text-xs align-middle leading-snug break-all ${muted}`}
        title={row.sku}
      >
        {row.sku}
      </td>
      <td
        className={`px-3 py-1.5 text-xs align-middle leading-snug break-words ${muted}`}
        title={getTopCategoryLabel(row.category, t)}
      >
        {getTopCategoryLabel(row.category, t)}
      </td>
      <td
        className={`px-3 py-1.5 text-xs align-middle leading-snug break-words ${muted}`}
        title={row.brand}
      >
        {row.brand}
      </td>
      <td className="px-3 py-1.5 align-middle min-w-[18rem]">
        {showSellerPriceInput ? (
          <div className="flex flex-col gap-0.5 min-w-0">
            <PricelistPriceControls
              value={value}
              onChange={(next) => {
                setValue(next)
                setError(null)
              }}
              stockStatus={stockStatus}
              onStockStatusChange={setStockStatus}
              saving={saving}
              onSave={handleSave}
              onSetStockStatus={handleSetStockStatus}
              t={t}
              checkButtonClass={checkButtonClass}
              priceInputClass={priceInputClass}
              priceCurrencyClass={priceCurrencyClass}
              currencySymbol={currencySymbol}
              isDark={isDark}
              {...priceControlLabels}
            />
            {error ? <span className="text-xs text-red-500">{error}</span> : null}
          </div>
        ) : showPriceInput ? (
          <div className="flex flex-col gap-0.5 min-w-0">
            {canApprovePriceEdits && row.pending_edit_requests?.length ? (
              <div className="flex flex-col gap-0.5 mb-0.5">
                {row.pending_edit_requests.map((req) => (
                  <span
                    key={req.id}
                    className={`text-xs leading-tight ${isDark ? 'text-amber-400' : 'text-amber-600'}`}
                  >
                    {t('pricelist.editRequestedBy', { seller: req.seller_label })}
                  </span>
                ))}
              </div>
            ) : null}
            <PricelistPriceControls
              value={value}
              onChange={(next) => {
                setValue(next)
                setError(null)
              }}
              stockStatus={stockStatus}
              onStockStatusChange={setStockStatus}
              saving={saving}
              onSave={handleSave}
              onSetStockStatus={handleSetStockStatus}
              t={t}
              checkButtonClass={checkButtonClass}
              priceInputClass={priceInputClass}
              priceCurrencyClass={priceCurrencyClass}
              currencySymbol={currencySymbol}
              isDark={isDark}
              {...priceControlLabels}
            />
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
                    title={t('pricelist.markHandledTitle', { seller: req.seller_label })}
                  >
                    {approvingId === req.id
                      ? t('pricelist.saving')
                      : t('pricelist.markHandled', { seller: req.seller_label })}
                  </button>
                ))}
              </div>
            ) : null}
            {error ? <span className="text-xs text-red-500">{error}</span> : null}
          </div>
        ) : showLockedSellerPrice ? (
          <div className="flex flex-col gap-0.5 min-w-0">
            {row.seller_stock_status ? (
              <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                {pricelistStockStatusLabel(row.seller_stock_status, t)}
              </span>
            ) : (
              <span className={isDark ? 'text-white tabular-nums' : 'text-gray-900 tabular-nums'}>
                {sellerPriceDisplay}
              </span>
            )}
            {row.edit_request_pending ? (
              <span className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                {t('pricelist.editRequestedAdmin')}
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
                {requesting ? t('pricelist.sending') : t('pricelist.requestEdit')}
              </button>
            ) : null}
            {error ? <span className="text-xs text-red-500">{error}</span> : null}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {row.display_stock_status ? (
              <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                {pricelistStockStatusLabel(row.display_stock_status, t)}
              </span>
            ) : (
              <span className={isDark ? 'text-white' : 'text-gray-900'}>
                {displayPrice ?? '—'}
              </span>
            )}
            {error ? <span className="text-xs text-red-500">{error}</span> : null}
          </div>
        )}
      </td>
      {showStar ? (
        <td className="px-3 py-1.5 align-middle">
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
        <td className="px-1 py-1.5 align-middle w-10">
          <button
            type="button"
            onClick={() => onRemove(row.product_id)}
            className={`p-1.5 rounded-lg transition-colors hover:bg-red-500/10 text-red-600 dark:text-red-400 ${muted} hover:text-red-600 dark:hover:text-red-400`}
            aria-label={t('pricelist.remove')}
            title={t('pricelist.remove')}
          >
            <TrashIcon className="w-5 h-5" aria-hidden />
          </button>
        </td>
      ) : null}
    </tr>
  )
}
