'use client'

import { useTheme } from '@/lib/theme'

/** Small product count above the catalog grid. */
export default function CatalogProductCount({ count }: { count: number }) {
  const { theme } = useTheme()
  const label = count === 1 ? '1 product' : `${count} products`

  return (
    <p
      className={`text-xs mb-3 mt-6 ${
        theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
      }`}
    >
      {label}
    </p>
  )
}
