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
  const muted = isDark ? 'text-gray-500' : 'text-gray-500'
  const heroBg = isDark
    ? 'bg-dark-900/80 border-dark-800'
    : 'bg-white border-gray-200'
  const Icon = ICONS[icon]

  return (
    <section className={`rounded-xl border px-3 py-3 sm:px-4 sm:py-3.5 mb-4 ${heroBg}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                isDark
                  ? 'border-gray-600 text-gray-300 bg-dark-950'
                  : 'border-gray-300 text-gray-700 bg-gray-50'
              }`}
            >
              <Icon className="w-3 h-3 shrink-0" />
              {badge}
            </span>
            <h1
              className={`text-lg sm:text-xl font-semibold tracking-tight ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              {title}
            </h1>
          </div>
          <p
            className={`text-sm font-medium leading-snug ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}
          >
            {subtitle}
          </p>
          <p className={`mt-0.5 text-xs leading-snug line-clamp-2 sm:line-clamp-1 ${muted}`}>
            {description}
          </p>
          {trendingLabel && stats.topName && (
            <p className={`mt-1.5 text-xs flex items-center gap-1.5 ${muted}`}>
              <ArrowTrendingUpIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                Trending: <span className="font-medium text-gray-400">{stats.topName}</span>
              </span>
            </p>
          )}
        </div>

        <div className="flex gap-2 shrink-0 sm:pl-2">
          <StatPill label="In catalog" value={String(stats.total)} isDark={isDark} />
          <StatPill label="This month" value={String(stats.newThisMonth)} isDark={isDark} />
          <StatPill label="Showing" value={String(stats.showing)} isDark={isDark} />
        </div>
      </div>
    </section>
  )
}

function StatPill({
  label,
  value,
  isDark,
}: {
  label: string
  value: string
  isDark: boolean
}) {
  return (
    <div
      className={`rounded-lg px-2.5 py-1.5 text-center border min-w-[4.25rem] ${
        isDark ? 'bg-dark-800/90 border-dark-700' : 'bg-gray-50 border-gray-200'
      }`}
    >
      <p className={`text-base font-semibold leading-none tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </p>
      <p className={`text-[10px] mt-0.5 leading-tight ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
        {label}
      </p>
    </div>
  )
}
