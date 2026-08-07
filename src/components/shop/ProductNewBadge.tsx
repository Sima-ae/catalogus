'use client'

import { isProductInCurrentCatalogWeek } from '@/lib/catalog'

type Props = {
  createdAt: string | Date | null | undefined
  className?: string
  /** `gallery` = product page main image (slightly larger). */
  variant?: 'card' | 'gallery'
}

/** Top-left corner triangle for products added in the current catalog week (Sun–Sun). */
export default function ProductNewBadge({
  createdAt,
  className = '',
  variant = 'card',
}: Props) {
  if (!createdAt || !isProductInCurrentCatalogWeek(createdAt)) return null

  const sizeClass =
    variant === 'gallery'
      ? 'product-featured-tip--gallery h-14 w-14 sm:h-16 sm:w-16'
      : 'h-11 w-11 sm:h-12 sm:w-12'

  return (
    <div
      className={`product-featured-tip pointer-events-none absolute left-0 top-0 z-[15] ${sizeClass} ${className}`.trim()}
      role="img"
      aria-label="NEW"
    >
      <div className="product-featured-tip-triangle absolute inset-0 bg-black" aria-hidden />
      <span className="sold-out-ribbon-text product-featured-tip-label absolute font-bold uppercase leading-none">
        NEW
      </span>
    </div>
  )
}
