'use client'

import { useMemo } from 'react'
import { useAppTheme } from '@/lib/theme-classes'
import SearchableCheckboxScroller from '@/components/admin/SearchableCheckboxScroller'

export type TaxonomyOption = {
  id: string
  name: string
  label: string
}

type ListItem = {
  id: string
  label: string
  name: string
}

type Props = {
  options: TaxonomyOption[]
  selected: Set<string>
  onChange: (selected: Set<string>) => void
  disabled?: boolean
  preview?: string | null
  emptyPreview?: string
  searchPlaceholder?: string
  noMatchesMessage?: string
}

export default function TaxonomyCheckboxList({
  options,
  selected,
  onChange,
  disabled = false,
  preview,
  emptyPreview,
  searchPlaceholder = 'Search…',
  noMatchesMessage = 'No matches',
}: Props) {
  const t = useAppTheme()
  const checkboxClass =
    'h-4 w-4 rounded border-gray-400 accent-primary-600 text-primary-600 focus:ring-primary-500'

  const toggle = (name: string) => {
    onChange(
      (() => {
        const next = new Set(selected)
        if (next.has(name)) next.delete(name)
        else next.add(name)
        return next
      })()
    )
  }

  const items = useMemo(() => {
    const knownNames = new Set(options.map((o) => o.name))
    const list: ListItem[] = options.map((opt) => ({
      id: opt.id,
      label: opt.label,
      name: opt.name,
    }))
    for (const name of Array.from(selected)) {
      if (!knownNames.has(name)) {
        list.push({
          id: `extra-${name}`,
          label: name,
          name,
        })
      }
    }
    return list
  }, [options, selected])

  return (
    <div className="space-y-2">
      <SearchableCheckboxScroller
        items={items}
        searchPlaceholder={searchPlaceholder}
        noMatchesMessage={noMatchesMessage}
        disabled={disabled}
        renderItem={(item) => {
          const checked = selected.has(item.name)
          return (
            <label
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer select-none ${
                checked
                  ? t.isDark
                    ? 'bg-primary-500/20'
                    : 'bg-primary-50'
                  : 'hover:bg-black/5 dark:hover:bg-white/5'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
              onClick={(e) => {
                if (disabled) return
                e.preventDefault()
                toggle(item.name)
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                readOnly
                tabIndex={-1}
                disabled={disabled}
                aria-hidden
                className={`${checkboxClass} pointer-events-none shrink-0`}
              />
              <span className={`text-sm flex-1 min-w-0 ${t.isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                {item.label}
              </span>
            </label>
          )
        }}
      />
      {preview !== undefined && preview !== null ? (
        <p className={`text-xs ${t.muted}`}>{preview || emptyPreview || '—'}</p>
      ) : null}
    </div>
  )
}
