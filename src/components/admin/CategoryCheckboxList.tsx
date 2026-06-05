'use client'

import type { CategoryPickerOption } from '@/lib/category-picker'
import { useAppTheme } from '@/lib/theme-classes'
import SearchableCheckboxScroller from '@/components/admin/SearchableCheckboxScroller'

type Props = {
  options: CategoryPickerOption[]
  selectedIds: string[]
  onToggle: (id: string) => void
  readOnly?: boolean
  maxHeightClass?: string
  searchPlaceholder?: string
  noMatchesMessage?: string
  disabled?: boolean
}

/** Hierarchical category checkboxes — each row is keyed by id (duplicate names stay separate). */
export default function CategoryCheckboxList({
  options,
  selectedIds,
  onToggle,
  readOnly = false,
  maxHeightClass = 'max-h-56',
  searchPlaceholder = 'Search categories…',
  noMatchesMessage = 'No matches',
  disabled = false,
}: Props) {
  const t = useAppTheme()

  if (readOnly) {
    const names = options
      .filter((c) => selectedIds.includes(c.id))
      .map((c) => c.listLabel)
    return (
      <p className={t.body}>
        {names.length ? names.join(', ') : 'All categories (none selected)'}
      </p>
    )
  }

  const items = options.map((c) => ({
    id: c.id,
    label: c.isSubcategory ? c.listLabel : c.name,
  }))

  return (
    <SearchableCheckboxScroller
      items={items}
      searchPlaceholder={searchPlaceholder}
      noMatchesMessage={noMatchesMessage}
      maxHeightClass={maxHeightClass}
      disabled={disabled}
      renderItem={(item) => {
        const c = options.find((opt) => opt.id === item.id)
        if (!c) return null
        return (
          <label
            className={`flex items-start gap-2.5 cursor-pointer form-check-label transition-colors ${
              c.isSubcategory
                ? `rounded-md px-2 py-1.5 border-l-2 ml-1 ${
                    t.isDark
                      ? 'border-primary-500/50 bg-dark-900/40 hover:bg-dark-900/70'
                      : 'border-primary-400 bg-white hover:bg-gray-100'
                  }`
                : `rounded-md px-2 py-1.5 ${t.isDark ? 'hover:bg-dark-900/50' : 'hover:bg-white'}`
            } ${
              selectedIds.includes(c.id)
                ? t.isDark
                  ? 'bg-primary-500/20'
                  : 'bg-primary-50'
                : ''
            }`}
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(c.id)}
              onChange={() => onToggle(c.id)}
              disabled={disabled}
              className={`mt-0.5 rounded shrink-0 h-4 w-4 accent-primary-600 ${
                t.isDark ? 'border-dark-500' : 'border-gray-400'
              }`}
            />
            <span className="min-w-0 flex-1">
              <span
                className={`block text-sm leading-snug ${
                  c.isSubcategory
                    ? t.isDark
                      ? 'text-gray-200'
                      : 'text-gray-800'
                    : `font-semibold ${t.heading}`
                }`}
              >
                {c.isSubcategory ? (
                  <>
                    <span className={`text-xs font-normal mr-1.5 ${t.muted}`}>↳</span>
                    {c.listLabel}
                  </>
                ) : (
                  c.listLabel
                )}
              </span>
              {c.isSubcategory && c.parent_name ? (
                <span className={`block text-xs mt-0.5 ${t.muted}`}>
                  Subcategory of {c.parent_name}
                </span>
              ) : null}
            </span>
          </label>
        )
      }}
    />
  )
}
