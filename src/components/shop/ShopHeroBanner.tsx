'use client'

import type { ReactNode } from 'react'
import { useTheme } from '@/lib/theme'
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline'
import ShopCatalogBadge from '@/components/shop/ShopCatalogBadge'
import ShopHeroSearch from '@/components/shop/ShopHeroSearch'
import RecentPurchaseActivity from '@/components/shop/RecentPurchaseActivity'

export type ShopHeroIcon = 'sparkles' | 'fire' | 'bag'

/** Right column — page copy only (not admin site tagline). */
export type ShopHeroAside = {
  heading?: string
  text?: string
  badge?: string
  badgeIcon?: ShopHeroIcon
}

export type ShopHeroBannerProps = {
  title: string
  subtitle: string
  aside?: ShopHeroAside
  showSocialProof?: boolean
  showSearch?: boolean
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  /** Third column — header actions (theme, cart, register, etc.) */
  actions?: ReactNode
  topProductName?: string | null
  trendingLabel?: boolean
}

export default function ShopHeroBanner({
  title,
  subtitle,
  aside = {},
  showSocialProof = false,
  showSearch = false,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  actions,
  topProductName,
  trendingLabel = false,
}: ShopHeroBannerProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const muted = isDark ? 'text-gray-500' : 'text-gray-500'
  const heroBg = isDark
    ? 'bg-dark-900/80 border-dark-800'
    : 'bg-white border-gray-200'
  const asideText = aside.text?.trim()
  const badgeText = aside.badge?.trim()
  const borderClass = isDark ? 'border-dark-700' : 'border-gray-200'
  const threeColumn = Boolean(showSearch && actions)

  const titleBlock = (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-1">
        <h1
          className={`text-lg sm:text-xl font-semibold tracking-tight shrink-0 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          {title}
        </h1>
        {showSocialProof ? (
          <div className="min-w-0 flex-1 max-w-md">
            <RecentPurchaseActivity variant="header" />
          </div>
        ) : null}
      </div>
      {subtitle.trim() ? (
        <p
          className={`text-sm font-medium leading-snug ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          {subtitle}
        </p>
      ) : null}
    </>
  )

  if (threeColumn) {
    return (
      <section className={`rounded-xl border px-3 py-3 sm:px-4 sm:py-4 mb-4 ${heroBg}`}>
        <div
          className={`grid grid-cols-1 gap-4 min-w-0 items-center
            lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1.28fr)_minmax(0,1.12fr)] lg:gap-5`}
        >
          <div className="min-w-0">{titleBlock}</div>

          <div className={`min-w-0 lg:border-l lg:pl-5 flex flex-col justify-center ${borderClass}`}>
            <ShopHeroSearch
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={onSearchChange}
            />
          </div>

          <div className={`min-w-0 lg:border-l lg:pl-5 flex flex-col justify-center ${borderClass}`}>
            {actions}
          </div>
        </div>
      </section>
    )
  }

  const hasRightColumn = Boolean(
    showSearch ||
      aside.heading?.trim() ||
      asideText ||
      badgeText ||
      (trendingLabel && topProductName)
  )

  return (
    <section className={`rounded-xl border px-3 py-3 sm:px-4 sm:py-4 mb-4 ${heroBg}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 md:items-start min-w-0">
        <div className="min-w-0">{titleBlock}</div>

        {hasRightColumn && (
          <aside
            className={`min-w-0 md:border-l md:pl-6 flex flex-col justify-center ${borderClass}`}
          >
            {showSearch ? (
              <ShopHeroSearch
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={onSearchChange}
              />
            ) : null}
            {badgeText ? (
              <ShopCatalogBadge
                label={badgeText}
                icon={aside.badgeIcon ?? 'sparkles'}
                className="mb-0"
              />
            ) : null}
            {aside.heading?.trim() ? (
              <p
                className={`text-sm font-semibold ${badgeText ? 'mt-2' : ''} mb-1 ${
                  isDark ? 'text-gray-200' : 'text-gray-800'
                }`}
              >
                {aside.heading.trim()}
              </p>
            ) : null}
            {asideText ? (
              <p className={`text-xs sm:text-sm leading-relaxed ${muted}`}>{asideText}</p>
            ) : null}
            {trendingLabel && topProductName && (
              <p className={`mt-2 text-xs flex items-center gap-1.5 ${muted}`}>
                <ArrowTrendingUpIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  Trending:{' '}
                  <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {topProductName}
                  </span>
                </span>
              </p>
            )}
          </aside>
        )}
      </div>
    </section>
  )
}
