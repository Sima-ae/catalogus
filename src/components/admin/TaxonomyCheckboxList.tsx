'use client'

import { useAppTheme } from '@/lib/theme-classes'

export type TaxonomyOption = {
  id: string
  name: string
  label: string
}

type Props = {
  options: TaxonomyOption[]
  selected: Set<string>
  onChange: (selected: Set<string>) => void
  disabled?: boolean
  preview?: string | null
  emptyPreview?: string
}

export default function TaxonomyCheckboxList({
  options,
  selected,
  onChange,
  disabled = false,
  preview,
  emptyPreview,
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

  const knownNames = new Set(options.map((o) => o.name))
  const extraSelected = Array.from(selected).filter((name) => !knownNames.has(name))

  return (
    <div className="space-y-2">
      <div
        className={`max-h-44 overflow-y-auto rounded-lg border p-2 space-y-1 ${
          t.isDark ? 'border-dark-600 bg-dark-800/50' : 'border-gray-200 bg-gray-50'
        }`}
      >
        {options.map((opt) => {
          const checked = selected.has(opt.name)
          return (
            <label
              key={opt.id}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer ${
                checked
                  ? t.isDark
                    ? 'bg-primary-500/20'
                    : 'bg-primary-50'
                  : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(opt.name)}
                disabled={disabled}
                className={checkboxClass}
              />
              <span className={`text-sm flex-1 ${t.isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                {opt.label}
              </span>
            </label>
          )
        })}
        {extraSelected.map((name) => (
          <label
            key={`extra-${name}`}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer ${
              t.isDark ? 'bg-primary-500/20' : 'bg-primary-50'
            }`}
          >
            <input
              type="checkbox"
              checked
              onChange={() => toggle(name)}
              disabled={disabled}
              className={checkboxClass}
            />
            <span className={`text-sm flex-1 ${t.isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              {name}
            </span>
          </label>
        ))}
      </div>
      {preview !== undefined && preview !== null ? (
        <p className={`text-xs ${t.muted}`}>
          {preview || emptyPreview || '—'}
        </p>
      ) : null}
    </div>
  )
}
