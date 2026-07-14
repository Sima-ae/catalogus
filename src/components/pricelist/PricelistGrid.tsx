'use client'

import type { PricelistRow } from '@/lib/pricelist-db'
import { formatPrice } from '@/lib/format-price'
import { pricelistStockStatusLabel } from '@/lib/pricelist-stock-status'
import PricelistProductThumb from '@/components/pricelist/PricelistProductThumb'
import PricelistGridPriceControls from '@/components/pricelist/PricelistGridPriceControls'
import { usePricelistRowPrice } from '@/lib/use-pricelist-row-price'
import { useShopCurrency } from '@/lib/shop-currency-context'
import { useI18n } from '@/lib/i18n-context'
import type { PricelistStockStatus } from '@/lib/pricelist-stock-status'

type CardProps = {
  row: PricelistRow
  isDark: boolean
  onOpenGallery?: (row: PricelistRow) => void
  canEditPrices: boolean
  isSeller: boolean
  canClearPrice: boolean
  onSavePrice: (productId: string, price: number, priceSellerId?: string) => Promise<void>
  onSetStockStatus?: (
    productId: string,
    stockStatus: PricelistStockStatus,
    priceSellerId?: string
  ) => Promise<void>
  onClearPrice?: (productId: string, priceSellerId?: string) => Promise<void>
}

function PricelistGridCard({
  row,
  isDark,
  onOpenGallery,
  canEditPrices,
  isSeller,
  canClearPrice,
  onSavePrice,
  onSetStockStatus,
  onClearPrice,
}: CardProps) {
  const { t } = useI18n()
  const { symbol: currencySymbol } = useShopCurrency()
  const card = isDark ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'

  const showSellerPriceInput = isSeller && canEditPrices && row.can_edit_price !== false
  const showPriceInput = canEditPrices && row.can_edit_price !== false && !isSeller
  const showEditablePrice = showSellerPriceInput || showPriceInput

  const {
    value,
    setValue,
    stockStatus,
    saving,
    error,
    setError,
    handleSave,
    handleSetStockStatus,
    clearStockStatusLocally,
  } = usePricelistRowPrice({
    row,
    canClearPrice,
    onSavePrice,
    onClearPrice,
    onSetStockStatus,
    t,
  })

  const displayPrice =
    row.display_stock_status == null && row.display_unit_price != null
      ? formatPrice(row.display_unit_price, { currencyCode: row.display_currency || 'EUR' })
      : null

  const readOnlyStockLabel =
    !showEditablePrice && row.display_stock_status
      ? pricelistStockStatusLabel(row.display_stock_status, t)
      : null

  return (
    <article
      className={`rounded-xl border overflow-hidden ${card} hover:shadow-lg transition-shadow flex flex-col`}
    >
      <PricelistProductThumb
        imageUrl={row.image_url}
        alt={row.name}
        onOpenGallery={onOpenGallery ? () => onOpenGallery(row) : undefined}
        className="relative aspect-[3/4] w-full bg-gray-100"
        sizes="(max-width: 640px) 50vw, 25vw"
      />
      <div className="p-3 space-y-1.5 flex-1 flex flex-col">
        {onOpenGallery ? (
          <button
            type="button"
            onClick={() => onOpenGallery(row)}
            className={`w-full text-left font-semibold text-sm line-clamp-2 hover:underline cursor-zoom-in ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {row.name}
          </button>
        ) : (
          <p className={`font-semibold text-sm line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {row.name}
          </p>
        )}
        <p className={`text-xs font-mono ${muted}`}>{row.sku}</p>

        {showEditablePrice ? (
          <div className="pt-1 mt-auto space-y-0.5">
            <PricelistGridPriceControls
              value={value}
              onChange={(next) => {
                setValue(next)
                setError(null)
              }}
              stockStatus={stockStatus}
              onClearStockStatus={clearStockStatusLocally}
              saving={saving}
              onSave={handleSave}
              onMarkOutOfStock={() => void handleSetStockStatus('out')}
              currencySymbol={currencySymbol}
              placeholder={t('pricelist.pricePlaceholder')}
              savePriceLabel={t('pricelist.savePrice')}
              savePriceForLabel={t('pricelist.savePriceFor', { name: row.name })}
              outOfStockLabel={t('pricelist.outOfStock')}
              isDark={isDark}
              t={t}
            />
            {error ? <p className="text-[10px] leading-tight text-red-500">{error}</p> : null}
          </div>
        ) : readOnlyStockLabel ? (
          <p
            className={`text-xs font-semibold mt-auto pt-1 ${
              isDark ? 'text-red-400' : 'text-red-600'
            }`}
          >
            {readOnlyStockLabel}
          </p>
        ) : displayPrice ? (
          <p className={`text-sm font-medium mt-auto pt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {displayPrice}
          </p>
        ) : null}
      </div>
    </article>
  )
}

type Props = {
  items: PricelistRow[]
  isDark: boolean
  onOpenGallery?: (row: PricelistRow) => void
  canEditPrices?: boolean
  isSeller?: boolean
  canClearPrice?: boolean
  onSavePrice?: (productId: string, price: number, priceSellerId?: string) => Promise<void>
  onSetStockStatus?: (
    productId: string,
    stockStatus: PricelistStockStatus,
    priceSellerId?: string
  ) => Promise<void>
  onClearPrice?: (productId: string, priceSellerId?: string) => Promise<void>
}

export default function PricelistGrid({
  items,
  isDark,
  onOpenGallery,
  canEditPrices = false,
  isSeller = false,
  canClearPrice = false,
  onSavePrice,
  onSetStockStatus,
  onClearPrice,
}: Props) {
  const canEdit = Boolean(canEditPrices && onSavePrice)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((row) => (
        <PricelistGridCard
          key={row.item_id}
          row={row}
          isDark={isDark}
          onOpenGallery={onOpenGallery}
          canEditPrices={canEdit}
          isSeller={isSeller}
          canClearPrice={canClearPrice}
          onSavePrice={onSavePrice ?? (async () => undefined)}
          onSetStockStatus={onSetStockStatus}
          onClearPrice={onClearPrice}
        />
      ))}
    </div>
  )
}
