'use client'

import { useTheme } from '@/lib/theme'

/** Small product count above the catalog grid. */
export default function CatalogProductCount({
  count,
  centered = false,
}: {
  count: number
  centered?: boolean
}) {
  const { theme } = useTheme()
  const label = count === 1 ? '1 product' : `${count} products`

  return (
    <p
      className={`text-xs mb-3 mt-6 ${centered ? 'text-center' : ''} ${
        theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
      }`}
    >
      {label}
    </p>
  )
}
