'use client'

/** Top-left corner triangle for featured (“Uitgelicht”) products on catalog cards. */
export default function ProductFeaturedTipBadge({ className = '' }: { className?: string }) {
  return (
    <div
      className={`product-featured-tip pointer-events-none absolute left-0 top-0 z-[15] h-11 w-11 sm:h-12 sm:w-12 ${className}`.trim()}
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
