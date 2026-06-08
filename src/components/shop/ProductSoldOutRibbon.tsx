'use client'

import { useI18n } from '@/lib/i18n-context'

type ProductSoldOutRibbonProps = {
  className?: string
}

/** Diagonal black ribbon with localized sold-out label over product images. */
export default function ProductSoldOutRibbon({ className = '' }: ProductSoldOutRibbonProps) {
  const { t } = useI18n()
  const label = t('shop.soldOut')

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[15] overflow-hidden ${className}`.trim()}
      role="img"
      aria-label={label}
    >
      <div className="absolute left-1/2 top-[42%] w-[155%] -translate-x-1/2 -translate-y-1/2 -rotate-[22deg] bg-black py-2.5 sm:py-3 shadow-md">
        <p className="px-2 text-center font-serif text-sm font-bold uppercase tracking-[0.18em] text-white whitespace-nowrap sm:text-base md:text-lg">
          {label}
        </p>
      </div>
    </div>
  )
}
