'use client'

import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/lib/theme'

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
  className = '',
}: {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  label?: string
  className?: string
}) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const clamped = Math.min(max, Math.max(min, value))

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {label ? (
        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
      ) : null}
      <div
        className={`inline-flex h-10 items-stretch overflow-hidden rounded-xl border ${
          isDark ? 'border-dark-600 bg-dark-800' : 'border-gray-200 bg-white'
        }`}
      >
        <button
          type="button"
          aria-label="Decrease quantity"
          className={`inline-flex w-10 items-center justify-center transition disabled:opacity-40 ${
            isDark
              ? 'text-gray-400 hover:bg-dark-700 hover:text-white'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          }`}
          disabled={clamped <= min}
          onClick={() => onChange(Math.max(min, clamped - 1))}
        >
          <MinusIcon className="h-4 w-4" />
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={clamped}
          aria-label={label || 'Quantity'}
          onChange={(e) => {
            const raw = Number(e.target.value)
            if (!Number.isFinite(raw)) return
            onChange(Math.min(max, Math.max(min, Math.floor(raw))))
          }}
          className={`w-12 border-x bg-transparent text-center text-sm tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
            isDark
              ? 'border-dark-600 text-white'
              : 'border-gray-200 text-gray-900'
          }`}
        />
        <button
          type="button"
          aria-label="Increase quantity"
          className={`inline-flex w-10 items-center justify-center transition disabled:opacity-40 ${
            isDark
              ? 'text-gray-400 hover:bg-dark-700 hover:text-white'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          }`}
          disabled={clamped >= max}
          onClick={() => onChange(Math.min(max, clamped + 1))}
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
