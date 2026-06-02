'use client'

import type { PricelistRow } from '@/lib/pricelist-db'
import { formatPrice } from '@/lib/format-price'
import PricelistProductThumb from '@/components/pricelist/PricelistProductThumb'

type Props = {
  items: PricelistRow[]
  isDark: boolean
  onOpenGallery?: (row: PricelistRow) => void
}

export default function PricelistGrid({ items, isDark, onOpenGallery }: Props) {
  const card = isDark ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((row) => (
        <article
          key={row.item_id}
          className={`rounded-xl border overflow-hidden ${card} hover:shadow-lg transition-shadow`}
        >
          <PricelistProductThumb
            imageUrl={row.image_url}
            alt={row.name}
            onOpenGallery={onOpenGallery ? () => onOpenGallery(row) : undefined}
            className="relative aspect-[3/4] w-full bg-gray-100"
            sizes="(max-width: 640px) 50vw, 25vw"
          />
          <div className="p-3 space-y-1">
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
            {row.display_unit_price != null ? (
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {formatPrice(row.display_unit_price, { currencyCode: row.display_currency || 'EUR' })}
              </p>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  )
}
