'use client'

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
  const compact = variant === 'card'

  return (
    <div className={`space-y-3 ${className}`}>
      {groups.map((group) => {
        const current = selected[group.name] ?? ''
        const selectId = groupSelectId(group, variant)
        return (
          <div key={group.name} className={compact ? 'space-y-1' : 'space-y-2'}>
            <div className="flex items-center gap-2 flex-wrap">
              <label
                htmlFor={selectId}
                className={`font-semibold shrink-0 ${
                  compact ? 'text-xs' : 'text-sm'
                } ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}
              >
                {group.name}:
              </label>
              {current && onClear ? (
                <button
                  type="button"
                  onClick={() => onClear(group.name)}
                  className={`text-xs underline-offset-2 hover:underline ${
                    theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {t('product.option.clear')}
                </button>
              ) : null}
            </div>
            <select
              id={selectId}
              value={current}
              onChange={(e) => onChange(group.name, e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                theme === 'dark'
                  ? 'bg-dark-900 border-dark-600 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
              } ${compact ? 'text-xs py-1.5' : ''}`}
            >
              <option value="">{t('product.option.choose')}</option>
              {group.values.map((value) => (
                <option key={value.label} value={value.label}>
                  {value.label}
                </option>
              ))}
            </select>
          </div>
        )
      })}
    </div>
  )
}

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
    <span className={`font-semibold text-xs sm:text-sm ${className}`}>
      {labels.join(' ')}
    </span>
  )
}
