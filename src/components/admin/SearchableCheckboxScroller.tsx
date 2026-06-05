'use client'

import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useAppTheme } from '@/lib/theme-classes'
import {
  firstIndexLetter,
  indexLettersFromLabels,
  matchesSearchQuery,
} from '@/lib/searchable-list'

export type SearchableListItem = {
  id: string
  label: string
}

type Props<T extends SearchableListItem> = {
  items: T[]
  searchPlaceholder?: string
  noMatchesMessage?: string
  maxHeightClass?: string
  disabled?: boolean
  renderItem: (item: T) => ReactNode
}

export default function SearchableCheckboxScroller<T extends SearchableListItem>({
  items,
  searchPlaceholder = 'Search…',
  noMatchesMessage = 'No matches',
  maxHeightClass = 'max-h-44',
  disabled = false,
  renderItem,
}: Props<T>) {
  const t = useAppTheme()
  const [query, setQuery] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef(new Map<string, HTMLElement>())

  const filteredItems = useMemo(() => {
    const q = query.trim()
    if (!q) return items
    return items.filter((item) => matchesSearchQuery(item.label, q))
  }, [items, query])

  const letters = useMemo(
    () => indexLettersFromLabels(items.map((item) => item.label)),
    [items]
  )

  const registerRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) itemRefs.current.set(id, el)
    else itemRefs.current.delete(id)
  }, [])

  const scrollToItem = useCallback((id: string) => {
    itemRefs.current.get(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [])

  const jumpToLetter = useCallback(
    (letter: string) => {
      const target = items.find((item) => firstIndexLetter(item.label) === letter)
      if (!target) return

      if (!itemRefs.current.has(target.id) && query.trim()) {
        setQuery('')
        requestAnimationFrame(() => scrollToItem(target.id))
      } else {
        scrollToItem(target.id)
      }

      listRef.current?.focus({ preventScroll: true })
    },
    [items, query, scrollToItem]
  )

  const onListKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || e.target !== listRef.current) return
    if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return
    const letter = e.key.toUpperCase()
    if (letters.includes(letter)) {
      e.preventDefault()
      jumpToLetter(letter)
    }
  }

  const inputClass = `w-full rounded-md border px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 ${
    t.isDark
      ? 'border-dark-600 bg-dark-800 text-gray-100 placeholder:text-gray-500'
      : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400'
  }`

  const listBorderClass = `overflow-y-auto rounded-lg border p-2 space-y-1 outline-none focus:ring-2 focus:ring-primary-500/40 ${
    t.isDark ? 'border-dark-600 bg-dark-800/50' : 'border-gray-200 bg-gray-50'
  }`

  return (
    <div className="space-y-2">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={searchPlaceholder}
        disabled={disabled}
        className={inputClass}
        aria-label={searchPlaceholder}
      />
      {letters.length > 3 ? (
        <div className="flex flex-wrap gap-0.5" role="toolbar" aria-label="Jump to letter">
          {letters.map((letter) => (
            <button
              key={letter}
              type="button"
              disabled={disabled}
              onClick={() => jumpToLetter(letter)}
              className={`min-w-[1.25rem] rounded px-1 py-0.5 text-[10px] font-semibold leading-none ${
                t.isDark
                  ? 'text-gray-300 hover:bg-dark-600 disabled:opacity-40'
                  : 'text-gray-600 hover:bg-gray-200 disabled:opacity-40'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      ) : null}
      <div
        ref={listRef}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={onListKeyDown}
        className={`${listBorderClass} ${maxHeightClass}`}
      >
        {filteredItems.length === 0 ? (
          <p className={`text-xs text-center py-3 ${t.muted}`}>{noMatchesMessage}</p>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} ref={(el) => registerRef(item.id, el)}>
              {renderItem(item)}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
