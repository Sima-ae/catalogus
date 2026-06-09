'use client'

import { CheckIcon } from '@heroicons/react/24/outline'

type Props = {
  value: string
  onChange: (value: string) => void
  saving: boolean
  onSave: () => void
  checkButtonClass: string
  inputClass: string
  currencyClass: string
  currencySymbol: string
  placeholder: string
  saveLabel: string
  saveForLabel: string
}

/** Currency amount input with save check — no stock-status controls (shipping, etc.). */
export default function PricelistAmountControls({
  value,
  onChange,
  saving,
  onSave,
  checkButtonClass,
  inputClass,
  currencyClass,
  currencySymbol,
  placeholder,
  saveLabel,
  saveForLabel,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap">
      <div className="relative flex-1 min-w-[5.5rem]">
        <span className={currencyClass} aria-hidden>
          {currencySymbol}
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => void onSave()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void onSave()
            }
          }}
          placeholder={placeholder}
          className={inputClass}
          aria-label={saveForLabel}
        />
      </div>
      <button
        type="button"
        onClick={() => void onSave()}
        disabled={saving || !value.trim()}
        className={checkButtonClass}
        title={saveLabel}
        aria-label={saveLabel}
      >
        {saving ? (
          <span className="text-xs px-0.5">…</span>
        ) : (
          <CheckIcon className="w-4 h-4" aria-hidden />
        )}
      </button>
    </div>
  )
}
