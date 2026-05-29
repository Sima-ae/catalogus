'use client'

import { useTheme } from '@/lib/theme'
import {
  SparklesIcon,
  FireIcon,
  ShoppingBagIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'
import type { ComponentType } from 'react'

export type ShopHeroIcon = 'sparkles' | 'fire' | 'bag'

export type ShopHeroBannerProps = {
  badge: string
  title: string
  subtitle: string
  description: string
  icon?: ShopHeroIcon
  stats: {
    total: number
    newThisMonth: number
    showing: number
    topName?: string | null
  }
  trendingLabel?: boolean
}

const ICONS: Record<ShopHeroIcon, ComponentType<{ className?: string }>> = {
  sparkles: SparklesIcon,
  fire: FireIcon,
  bag: ShoppingBagIcon,
}

export default function ShopHeroBanner({
  badge,
  title,
  subtitle,
  description,
  icon = 'sparkles',
  stats,
  trendingLabel = false,
}: ShopHeroBannerProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'
  const heroBg = isDark
    ? 'bg-gradient-to-br from-dark-900 via-dark-950 to-black border-dark-800'
    : 'bg-gradient-to-br from-gray-100 via-white to-gray-50 border-gray-200'
  const Icon = ICONS[icon]

  return (
    <section className={`rounded-2xl border p-6 sm:p-8 mb-8 ${heroBg}`}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-primary-500 text-white mb-4">
            <Icon className="w-4 h-4" />
            {badge}
          </span>
          <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h1>
          <p className={`text-lg font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            {subtitle}
          </p>
          <p className={`text-sm sm:text-base leading-relaxed ${muted}`}>{description}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0 w-full lg:w-auto">
          <StatPill label="In catalog" value={String(stats.total)} isDark={isDark} />
          <StatPill label="This month" value={String(stats.newThisMonth)} isDark={isDark} />
          <StatPill
            label="Showing"
            value={String(stats.showing)}
            isDark={isDark}
            className="col-span-2 sm:col-span-1"
          />
        </div>
      </div>
      {trendingLabel && stats.topName && (
        <p className={`mt-4 text-sm flex items-center gap-2 ${muted}`}>
          <ArrowTrendingUpIcon className="w-4 h-4 shrink-0" />
          Trending now: <span className="font-medium text-inherit">{stats.topName}</span>
        </p>
      )}
    </section>
  )
}

function StatPill({
  label,
  value,
  isDark,
  className = '',
}: {
  label: string
  value: string
  isDark: boolean
  className?: string
}) {
  return (
    <div
      className={`rounded-xl px-4 py-3 text-center border ${className} ${
        isDark ? 'bg-dark-800/80 border-dark-700' : 'bg-white border-gray-200 shadow-sm'
      }`}
    >
      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
    </div>
  )
}
