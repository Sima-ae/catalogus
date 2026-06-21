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
            <div
              role="checkbox"
              aria-checked={checked}
              aria-label={item.label}
              tabIndex={disabled ? -1 : 0}
              onClick={() => {
                if (disabled) return
                toggle(item.name)
              }}
              onKeyDown={(e) => {
                if (disabled) return
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggle(item.name)
                }
              }}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 ${
                checked
                  ? t.isDark
                    ? 'bg-primary-500/20'
                    : 'bg-primary-50'
                  : 'hover:bg-black/5 dark:hover:bg-white/5'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <span
                aria-hidden
                className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  checked
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : t.isDark
                      ? 'border-dark-500 bg-dark-900'
                      : 'border-gray-400 bg-white'
                }`}
              >
                {checked ? (
                  <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2.5 6.2 4.8 8.5 9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </span>
              <span className={`text-sm flex-1 min-w-0 ${t.isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                {item.label}
              </span>
            </div>
          )
        }}
      />
      {preview !== undefined && preview !== null ? (
        <p className={`text-xs ${t.muted}`}>{preview || emptyPreview || '—'}</p>
      ) : null}
    </div>
  )
}
