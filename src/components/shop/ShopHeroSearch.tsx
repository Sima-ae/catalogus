'use client'

import { useTheme } from '@/lib/theme'

type ShopHeroSearchProps = {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
  className?: string
}

export default function ShopHeroSearch({
  placeholder = 'Search products...',
  value,
  onChange,
  onSubmit,
  className = '',
}: ShopHeroSearchProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className={`relative w-full ${className}`.trim()}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
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
        className={`w-full pl-10 pr-4 py-2.5 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
          isDark
            ? 'bg-dark-700 border border-dark-600 text-white placeholder-gray-400'
            : 'bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-500'
        }`}
      />
    </div>
  )
}
