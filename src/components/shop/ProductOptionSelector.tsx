'use client'

import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/lib/theme'
import type { ProductOptionGroup, ProductOptions } from '@/lib/product-options'
import { useI18n } from '@/lib/i18n-context'

type Props = {
  groups: ProductOptions
  selected: Record<string, string>
  onChange: (groupName: string, valueLabel: string) => void
  onClear?: (groupName: string) => void
  variant?: 'page' | 'card'
  className?: string
}

function groupSelectId(group: ProductOptionGroup, variant: string) {
  return `product-option-${variant}-${group.slug || group.name}`
}

export default function ProductOptionSelector({
  groups,
  selected,
  onChange,
  onClear,
  variant = 'page',
  className = '',
}: Props) {
  const { theme } = useTheme()
  const { t } = useI18n()
  const isDark = theme === 'dark'
  const compact = variant === 'card'

  return (
    <div className={`space-y-3 ${className}`}>
      {groups.map((group) => {
        const current = selected[group.name] ?? ''
        const selectId = groupSelectId(group, variant)
        return (
          <div key={group.name} className={compact ? 'space-y-1.5' : 'space-y-2'}>
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor={selectId}
                className={`font-bold shrink-0 ${
                  compact ? 'text-xs' : 'text-sm'
                } ${isDark ? 'text-gray-100' : 'text-gray-900'}`}
              >
                {group.name}:
              </label>
              {current && onClear ? (
                <button
                  type="button"
                  onClick={() => onClear(group.name)}
                  className={`inline-flex items-center gap-0.5 text-xs hover:underline underline-offset-2 ${
                    isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <span aria-hidden>×</span>
                  {t('product.option.clear')}
                </button>
              ) : null}
            </div>
            <div className="relative">
              <select
                id={selectId}
                value={current}
                onChange={(e) => onChange(group.name, e.target.value)}
                className={`w-full appearance-none rounded-full border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/60 ${
                  compact ? 'py-1.5 pl-3 pr-8 text-xs' : 'py-2.5 pl-4 pr-10 text-sm'
                } ${
                  isDark
                    ? 'bg-dark-900 border-dark-600 text-gray-100'
                    : 'bg-white border-gray-300 text-gray-800 shadow-sm'
                } ${!current ? (isDark ? 'text-gray-500' : 'text-gray-400') : ''}`}
              >
                <option value="">{t('product.option.choose')}</option>
                {group.values.map((value) => (
                  <option key={value.label} value={value.label}>
                    {value.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 ${
                  compact ? 'right-2 h-3.5 w-3.5' : 'right-3 h-4 w-4'
                }`}
                aria-hidden
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Read-only label when a product has exactly one option tier (e.g. "Mechanism: Swiss"). */
export function ProductFixedOptionDisplay({
  groups,
  variant = 'page',
  className = '',
}: {
  groups: ProductOptions
  variant?: 'page' | 'card'
  className?: string
}) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const compact = variant === 'card'
  const group = groups[0]
  const value = group?.values[0]
  if (!group || !value) return null

  return (
    <p
      className={`${compact ? 'text-xs' : 'text-sm'} ${className} ${
        isDark ? 'text-gray-200' : 'text-gray-800'
      }`}
    >
      <span className="font-bold">{group.name}:</span> {value.label}
    </p>
  )
}

/** Compact tier labels for product cards (e.g. "Japanese  Swiss"). */
export function ProductOptionLabels({
  groups,
  className = '',
}: {
  groups: ProductOptions
  className?: string
}) {
  const labels = groups.flatMap((g) => g.values.map((v) => v.label))
  if (!labels.length) return null
  return (
    <span
      className={`inline-flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5 font-bold leading-tight ${
        className || 'text-xs sm:text-sm'
      }`}
    >
      {labels.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </span>
  )
}
