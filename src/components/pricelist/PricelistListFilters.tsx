'use client'

import { useI18n } from '@/lib/i18n-context'
import { getTopCategoryLabel } from '@/lib/i18n-categories'

type BaseProps = {
  options: string[]
  value: string
  onChange: (value: string) => void
  isDark: boolean
  variant?: 'bar' | 'header'
  columnLabel: string
  allLabel: string
  ariaLabel: string
  formatOption?: (value: string) => string
}

export function PricelistColumnFilter({
  options,
  value,
  onChange,
  isDark,
  variant = 'header',
  columnLabel,
  allLabel,
  ariaLabel,
  formatOption = (v) => v,
}: BaseProps) {
  if (options.length === 0) return null

  const selectClass =
    variant === 'header'
      ? `mt-1 w-full max-w-full rounded border px-1.5 py-1 text-xs font-normal normal-case tracking-normal ${
          isDark
            ? 'bg-dark-900 border-dark-600 text-gray-200'
            : 'bg-white border-gray-300 text-gray-800'
        }`
      : `rounded-lg border px-3 py-2 text-sm min-w-[10rem] max-w-full ${
          isDark
            ? 'bg-dark-800 border-dark-600 text-white'
            : 'bg-white border-gray-300 text-gray-900'
        }`

  const select = (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={selectClass}
      aria-label={ariaLabel}
    >
      <option value="">{allLabel}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {formatOption(opt)}
        </option>
      ))}
    </select>
  )

  if (variant === 'header') return select

  return (
    <label className="flex flex-col gap-1 min-w-[10rem]">
      <span
        className={`text-xs font-semibold uppercase tracking-wide ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}
      >
        {columnLabel}
      </span>
      {select}
    </label>
  )
}

type BarProps = {
  categoryOptions: string[]
  brandOptions: string[]
  categoryFilter: string
  brandFilter: string
  onCategoryFilterChange: (value: string) => void
  onBrandFilterChange: (value: string) => void
  isDark: boolean
}

/** Filter row for grid view (table uses header dropdowns). */
export default function PricelistListFiltersBar({
  categoryOptions,
  brandOptions,
  categoryFilter,
  brandFilter,
  onCategoryFilterChange,
  onBrandFilterChange,
  isDark,
}: BarProps) {
  const { t } = useI18n()
  if (categoryOptions.length === 0 && brandOptions.length === 0) return null

  return (
    <div className="flex flex-wrap items-end gap-3">
      <PricelistColumnFilter
        options={categoryOptions}
        value={categoryFilter}
        onChange={onCategoryFilterChange}
        isDark={isDark}
        variant="bar"
        columnLabel={t('pricelist.col.category')}
        allLabel={t('pricelist.filter.allCategories')}
        ariaLabel={t('pricelist.filter.categoryAria')}
        formatOption={(cat) => getTopCategoryLabel(cat, t)}
      />
      <PricelistColumnFilter
        options={brandOptions}
        value={brandFilter}
        onChange={onBrandFilterChange}
        isDark={isDark}
        variant="bar"
        columnLabel={t('pricelist.col.brand')}
        allLabel={t('pricelist.filter.allBrands')}
        ariaLabel={t('pricelist.filter.brandAria')}
      />
    </div>
  )
}
