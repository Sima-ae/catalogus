'use client'

import React from 'react'
import Link from 'next/link'
import { useAppTheme } from '@/lib/theme-classes'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  accentColor: string
  change?: string
  /** Filter or other in-page action */
  onClick?: () => void
  /** Navigate to another admin page (e.g. Trash) */
  href?: string
  /** Highlight when this card’s filter is active */
  active?: boolean
  /** Smaller padding/type for dense rows (e.g. 7 product stats). */
  compact?: boolean
}

export default function StatCard({
  title,
  value,
  icon,
  accentColor,
  change,
  onClick,
  href,
  active = false,
  compact = false,
}: StatCardProps) {
  const t = useAppTheme()
  const clickable = Boolean(onClick || href)

  const className = [
    'card block w-full text-left transition-shadow',
    compact ? '!p-2.5 sm:!p-3' : '',
    clickable ? 'cursor-pointer hover:shadow-md' : '',
    active ? 'ring-2 ring-primary-500 shadow-md' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      <div className={`flex items-center justify-between ${compact ? 'gap-1.5' : ''}`}>
        <div className="min-w-0">
          <p
            className={`font-medium leading-tight ${t.muted} ${
              compact ? 'text-[11px] sm:text-xs line-clamp-2' : 'text-sm'
            }`}
          >
            {title}
          </p>
          <p
            className={`font-bold ${t.heading} ${
              compact ? 'text-lg sm:text-xl mt-0.5 tabular-nums' : 'text-2xl mt-1'
            }`}
          >
            {value}
          </p>
          {change && <p className={`text-sm mt-1 ${t.muted}`}>{change}</p>}
        </div>
        <div
          className={`shrink-0 rounded-lg flex items-center justify-center ${accentColor} ${
            compact ? 'w-8 h-8 sm:w-9 sm:h-9' : 'w-12 h-12'
          }`}
        >
          {compact
            ? React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
                  className: 'w-4 h-4 sm:w-5 sm:h-5 text-white',
                })
              : icon
            : icon}
        </div>
      </div>
      <div className={`h-1 ${accentColor} rounded-full ${compact ? 'mt-2' : 'mt-4'}`} />
    </>
  )

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    )
  }

  return <div className={className}>{content}</div>
}
