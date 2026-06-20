'use client'

import { useTheme } from '@/lib/theme'
import { formatPrice, formatPriceAmount, hasPublicOriginalPrice, isZeroPrice } from '@/lib/format-price'
import { useShopCurrency } from '@/lib/shop-currency-context'
import { useI18n } from '@/lib/i18n-context'
import { useChat } from '@/components/chat/ChatProvider'

type Props = {
  price: number
  originalPrice?: number | null
  productId?: string
  size?: 'card' | 'page'
  className?: string
}

export default function ProductOptionPrice({
  price,
  originalPrice,
  productId,
  size = 'page',
  className = '',
}: Props) {
  const { theme } = useTheme()
  const { t } = useI18n()
  const { symbol: currencySymbol } = useShopCurrency()
  const { requestQuote } = useChat()
  const isDark = theme === 'dark'
  const compact = size === 'card'

  const showOriginal = hasPublicOriginalPrice(originalPrice, price)
  const onRequest = isZeroPrice(price)

  if (onRequest) {
    return (
      <button
        type="button"
        className={`font-bold text-primary-500 hover:underline ${compact ? 'text-sm sm:text-base' : 'text-2xl sm:text-3xl'} ${className}`}
        onClick={() => {
          if (!productId) return
          requestQuote({ productId })
        }}
        disabled={!productId}
      >
        {t('product.priceOnRequest')}
      </button>
    )
  }

  return (
    <div className={`space-y-0.5 ${className}`}>
      {showOriginal ? (
        <div
          className={`line-through tabular-nums ${
            compact ? 'text-xs' : 'text-lg sm:text-xl'
          } ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
        >
          {formatPrice(originalPrice)}
        </div>
      ) : null}
      <div className="flex items-baseline gap-1.5 tabular-nums">
        {!compact ? (
          <span
            className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} ${
              compact ? 'text-sm' : 'text-xl'
            }`}
            aria-hidden
          >
            {currencySymbol}
          </span>
        ) : null}
        <span
          className={`font-bold text-primary-500 ${
            compact ? 'text-sm sm:text-base' : 'text-2xl sm:text-3xl'
          }`}
        >
          {compact ? formatPrice(price) : formatPriceAmount(price)}
        </span>
      </div>
    </div>
  )
}
