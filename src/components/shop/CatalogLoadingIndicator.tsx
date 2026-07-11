'use client'

import { useI18n } from '@/lib/i18n-context'
import { useTheme } from '@/lib/theme'

type Props = {
  message?: string
  className?: string
  compact?: boolean
  isDark?: boolean
  /** Simulated load progress 0–100 (catalog overlay). */
  percent?: number
}

/** Spinner + localized loading text for catalog filter and pagination fetches. */
export default function CatalogLoadingIndicator({
  message,
  className = '',
  compact = false,
  isDark: isDarkProp,
  percent,
}: Props) {
  const { t } = useI18n()
  const { theme } = useTheme()
  const isDark = isDarkProp ?? theme === 'dark'
  const text = message ?? t('loading.products')
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'
  const showPercent = typeof percent === 'number'

  return (
    <div
      className={`text-center ${compact ? 'py-12' : 'py-16'} ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={`animate-spin rounded-full border-b-2 border-primary-500 mx-auto mb-4 ${
          compact ? 'h-10 w-10' : 'h-12 w-12'
        }`}
      />
      <p className={`${compact ? 'text-sm' : 'text-lg'} ${muted}`}>{text}</p>
      {showPercent ? (
        <p
          className={`mt-3 text-2xl font-semibold tabular-nums tracking-tight ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          {percent}%
        </p>
      ) : null}
    </div>
  )
}
