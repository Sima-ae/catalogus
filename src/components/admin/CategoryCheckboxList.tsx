'use client'

import type { CategoryPickerOption } from '@/lib/category-picker'
import { useAppTheme } from '@/lib/theme-classes'

type Props = {
  options: CategoryPickerOption[]
  selectedIds: string[]
  onToggle: (id: string) => void
  readOnly?: boolean
  maxHeightClass?: string
}

/** Hierarchical category checkboxes — subcategories show as indented items with parent path. */
export default function CategoryCheckboxList({
  options,
  selectedIds,
  onToggle,
  readOnly = false,
  maxHeightClass = 'max-h-56',
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

  return (
    <div
      className={`overflow-y-auto rounded-lg border ${maxHeightClass} ${
        t.isDark ? 'border-dark-600 bg-dark-800' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <ul className="divide-y divide-gray-200/80 dark:divide-dark-700/80">
        {options.map((c) => (
          <li key={c.id}>
            <label
              className={`flex items-start gap-2.5 cursor-pointer form-check-label transition-colors ${
                c.isSubcategory
                  ? `py-2.5 pr-3 pl-5 border-l-2 ml-3 ${
                      t.isDark
                        ? 'border-primary-500/50 bg-dark-900/40 hover:bg-dark-900/70'
                        : 'border-primary-400 bg-white hover:bg-gray-100'
                    }`
                  : `py-2.5 px-3 ${t.isDark ? 'hover:bg-dark-900/50' : 'hover:bg-white'}`
              }`}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(c.id)}
                onChange={() => onToggle(c.id)}
                className={`mt-0.5 rounded shrink-0 ${
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
          </li>
        ))}
      </ul>
    </div>
  )
}
