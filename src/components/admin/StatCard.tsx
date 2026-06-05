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
}: StatCardProps) {
  const t = useAppTheme()
  const clickable = Boolean(onClick || href)

  const className = [
    'card block w-full text-left transition-shadow',
    clickable ? 'cursor-pointer hover:shadow-md' : '',
    active ? 'ring-2 ring-primary-500 shadow-md' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${t.muted}`}>{title}</p>
          <p className={`text-2xl font-bold mt-1 ${t.heading}`}>{value}</p>
          {change && <p className={`text-sm mt-1 ${t.muted}`}>{change}</p>}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${accentColor}`}>
          {icon}
        </div>
      </div>
      <div className={`h-1 ${accentColor} rounded-full mt-4`} />
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
