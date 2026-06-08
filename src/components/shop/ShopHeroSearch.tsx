'use client'

import { useTheme } from '@/lib/theme'

type ShopHeroSearchProps = {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
  className?: string
  /** Tighter field on small screens so search shares a row with header actions. */
  compactOnMobile?: boolean
}

export default function ShopHeroSearch({
  placeholder = 'Search products...',
  value,
  onChange,
  onSubmit,
  className = '',
  compactOnMobile = false,
}: ShopHeroSearchProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const iconClass = compactOnMobile
    ? 'absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none sm:left-3 sm:w-5 sm:h-5'
    : 'absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none'
  const inputClass = compactOnMobile
    ? 'w-full pl-8 pr-2.5 py-1.5 text-sm rounded-lg sm:pl-10 sm:pr-4 sm:py-2.5 sm:text-base'
    : 'w-full pl-10 pr-4 py-2.5 rounded-lg'

  return (
    <div className={`relative w-full ${className}`.trim()}>
      <svg
        className={iconClass}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit?.(String(value ?? '').trim())
        }}
        placeholder={placeholder}
        className={`${inputClass} transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
          isDark
            ? 'bg-dark-700 border border-dark-600 text-white placeholder-gray-400'
            : 'bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-500'
        }`}
      />
    </div>
  )
}
