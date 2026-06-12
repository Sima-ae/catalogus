'use client'

type Props = {
  className?: string
  /** `gallery` = product page main image (slightly larger). */
  variant?: 'card' | 'gallery'
}

/** Top-left corner triangle for featured (“Uitgelicht”) products. */
export default function ProductFeaturedTipBadge({
  className = '',
  variant = 'card',
}: Props) {
  const sizeClass =
    variant === 'gallery' ? 'product-featured-tip--gallery h-14 w-14 sm:h-16 sm:w-16' : 'h-11 w-11 sm:h-12 sm:w-12'

  return (
    <div
      className={`product-featured-tip pointer-events-none absolute left-0 top-0 z-[15] ${sizeClass} ${className}`.trim()}
      role="img"
      aria-label="TIP"
    >
      <div className="product-featured-tip-triangle absolute inset-0 bg-black" aria-hidden />
      <span className="sold-out-ribbon-text product-featured-tip-label absolute font-bold uppercase leading-none">
        TIP
      </span>
    </div>
  )
}
