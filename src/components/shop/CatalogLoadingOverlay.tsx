'use client'

import CatalogLoadingIndicator from '@/components/shop/CatalogLoadingIndicator'
import { useTheme } from '@/lib/theme'

type Props = {
  active: boolean
  message?: string
}

/** Full-viewport loading overlay — sits above the sticky header and message ticker. */
export default function CatalogLoadingOverlay({ active, message }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (!active) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" aria-hidden />
      <div
        className={`relative w-full max-w-sm overflow-hidden rounded-2xl border shadow-2xl ${
          isDark ? 'border-dark-700 bg-dark-900' : 'border-gray-200 bg-white'
        }`}
      >
        <div className="h-1 overflow-hidden bg-black/10" aria-hidden>
          <div className="catalog-filter-progress h-full w-1/3 bg-primary-500" />
        </div>
        <CatalogLoadingIndicator
          message={message}
          isDark={isDark}
          className="!py-10"
        />
      </div>
    </div>
  )
}
