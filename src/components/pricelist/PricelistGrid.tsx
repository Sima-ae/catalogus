'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { PricelistRow } from '@/lib/pricelist-db'
import { formatPrice } from '@/lib/format-price'
import { shouldUnoptimizeProductImage } from '@/lib/product-image-url'
import { appPath } from '@/lib/paths'

type Props = {
  items: PricelistRow[]
  isDark: boolean
}

export default function PricelistGrid({ items, isDark }: Props) {
  const card = isDark ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((row) => (
        <Link
          key={row.item_id}
          href={appPath(`/product/${row.product_id}`)}
          className={`rounded-xl border overflow-hidden ${card} hover:shadow-lg transition-shadow`}
        >
          <div className="relative aspect-[3/4] bg-gray-100">
            <Image
              src={row.image_url || '/placeholder.png'}
              alt={row.name}
              fill
              className="object-contain p-2"
              unoptimized={shouldUnoptimizeProductImage(row.image_url)}
            />
          </div>
          <div className="p-3 space-y-1">
            <p className={`font-semibold text-sm line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {row.name}
            </p>
            <p className={`text-xs font-mono ${muted}`}>{row.sku}</p>
            {row.display_unit_price != null ? (
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {formatPrice(row.display_unit_price, { currencyCode: row.display_currency || 'EUR' })}
              </p>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  )
}
