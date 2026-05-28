'use client'

import { StarIcon } from '@heroicons/react/24/solid'
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline'

type UserStarRatingProps = {
  rating: number | null | undefined
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  emptyLabel?: string
  className?: string
}

const SIZES = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
}

/** Read-only 5-star display (Google-style). */
export default function UserStarRating({
  rating,
  size = 'md',
  showValue = true,
  emptyLabel = 'No rating yet',
  className = '',
}: UserStarRatingProps) {
  const stars = clampBadgeRating(rating)
  const iconClass = SIZES[size]

  if (stars === null) {
    return (
      <span className={`inline-flex items-center gap-1 text-gray-500 text-sm ${className}`}>
        {emptyLabel}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} title={`${stars} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) =>
        i <= stars ? (
          <StarIcon key={i} className={`${iconClass} text-amber-400`} aria-hidden />
        ) : (
          <StarOutlineIcon key={i} className={`${iconClass} text-gray-600`} aria-hidden />
        )
      )}
      {showValue && (
        <span className="ml-1.5 text-sm text-gray-300 tabular-nums">
          {stars.toFixed(1).replace(/\.0$/, '')}/5
        </span>
      )}
    </span>
  )
}

function clampBadgeRating(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const n = Math.round(Number(value))
  if (!Number.isFinite(n) || n < 1 || n > 5) return null
  return n
}

type UserStarRatingEditorProps = {
  value: number | null
  onChange: (rating: number | null) => void
  disabled?: boolean
}

/** Interactive stars — super admin only. */
export function UserStarRatingEditor({ value, onChange, disabled }: UserStarRatingEditorProps) {
  const current = value !== null && value >= 1 && value <= 5 ? value : 0

  return (
    <div className="inline-flex items-center gap-0.5" role="group" aria-label="Set user badge rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star === current ? null : star)}
          className="p-0.5 rounded hover:scale-110 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          title={star === current ? 'Clear rating' : `Rate ${star} stars`}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          {star <= current ? (
            <StarIcon className="w-5 h-5 text-amber-400" />
          ) : (
            <StarOutlineIcon className="w-5 h-5 text-gray-500 hover:text-amber-300" />
          )}
        </button>
      ))}
      {current > 0 && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(null)}
          className="ml-2 text-xs text-gray-500 hover:text-gray-300 disabled:opacity-40"
        >
          Clear
        </button>
      )}
    </div>
  )
}
