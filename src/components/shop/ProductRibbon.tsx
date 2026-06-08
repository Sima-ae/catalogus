'use client'

import { useI18n } from '@/lib/i18n-context'

export type ProductRibbonKind = 'soldOut' | 'preOrder'

const MESSAGE_KEYS: Record<ProductRibbonKind, string> = {
  soldOut: 'shop.soldOut',
  preOrder: 'shop.preOrder',
}

type ProductRibbonProps = {
  kind: ProductRibbonKind
  className?: string
  /** `card` = full product card edge-to-edge; `gallery` = product page main image */
  variant?: 'card' | 'gallery'
}

/** Diagonal black ribbon with localized product status label. */
export default function ProductRibbon({
  kind,
  className = '',
  variant = 'gallery',
}: ProductRibbonProps) {
  const { t } = useI18n()
  const label = t(MESSAGE_KEYS[kind])
  const isCard = variant === 'card'

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-20 overflow-hidden ${className}`.trim()}
      role="img"
      aria-label={label}
    >
      <div
        className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[22deg] bg-black shadow-md ${
          isCard
            ? 'top-[54%] w-[132%] py-2 sm:py-2.5'
            : 'top-[50%] w-[128%] py-2.5 sm:py-3'
        }`}
      >
        <p
          className={`sold-out-ribbon-text px-2 text-center font-serif font-bold uppercase tracking-[0.18em] whitespace-nowrap ${
            isCard ? 'text-xs sm:text-sm' : 'text-sm sm:text-base md:text-lg'
          }`}
        >
          {label}
        </p>
      </div>
    </div>
  )
}
