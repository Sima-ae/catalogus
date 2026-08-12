'use client'

import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/lib/theme'

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
  size = 'md',
  className = '',
}: {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  label?: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const clamped = Math.min(max, Math.max(min, value))
  const compact = size === 'sm'
  const shell = compact ? 'h-7 rounded-lg' : 'h-10 rounded-xl'
  const btn = compact ? 'w-7' : 'w-10'
  const inputW = compact ? 'w-8' : 'w-12'
  const icon = compact ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const text = compact ? 'text-xs' : 'text-sm'

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {label ? (
        <span className={`${text} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
      ) : null}
      <div
        className={`inline-flex items-stretch overflow-hidden border ${shell} ${
          isDark ? 'border-dark-600 bg-dark-800' : 'border-gray-200 bg-white'
        }`}
      >
        <button
          type="button"
          aria-label="Decrease quantity"
          className={`inline-flex items-center justify-center transition disabled:opacity-40 ${btn} ${
            isDark
              ? 'text-gray-400 hover:bg-dark-700 hover:text-white'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          }`}
          disabled={clamped <= min}
          onClick={() => onChange(Math.max(min, clamped - 1))}
        >
          <MinusIcon className={icon} />
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
          className={`${inputW} border-x bg-transparent text-center tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${text} ${
            isDark
              ? 'border-dark-600 text-white'
              : 'border-gray-200 text-gray-900'
          }`}
        />
        <button
          type="button"
          aria-label="Increase quantity"
          className={`inline-flex items-center justify-center transition disabled:opacity-40 ${btn} ${
            isDark
              ? 'text-gray-400 hover:bg-dark-700 hover:text-white'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          }`}
          disabled={clamped >= max}
          onClick={() => onChange(Math.min(max, clamped + 1))}
        >
          <PlusIcon className={icon} />
        </button>
      </div>
    </div>
  )
}
