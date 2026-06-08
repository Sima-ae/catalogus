'use client'

import type { ReactNode } from 'react'
import { useTheme } from '@/lib/theme'
import RecentPurchaseActivity from '@/components/shop/RecentPurchaseActivity'
import ShopHeroSearch from '@/components/shop/ShopHeroSearch'

export type AppStickyHeaderProps = {
  title: string
  showSocialProof?: boolean
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  onSearchSubmit?: (value: string) => void
  showSearch?: boolean
  actions: ReactNode
  /** Mobile menu etc. — inline with title on the same row */
  leading?: ReactNode
  /** Replaces default title + social proof block */
  leftContent?: ReactNode
  className?: string
  /** Narrower search field (e.g. admin header with many action buttons). */
  searchClassName?: string
  /** Override the lg 3-column grid template. */
  headerGridClassName?: string
}

export default function AppStickyHeader({
  title,
  showSocialProof = false,
  searchPlaceholder = 'Search products...',
  searchValue,
  onSearchChange,
  onSearchSubmit,
  showSearch = true,
  actions,
  leading,
  leftContent,
  className = '',
  searchClassName,
  headerGridClassName,
}: AppStickyHeaderProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const borderClass = isDark ? 'border-dark-700' : 'border-gray-200'
  const shellBg = isDark ? 'bg-dark-900/95' : 'bg-gray-50/95'
  const cardBg = isDark ? 'bg-dark-900/80 border-dark-800' : 'bg-white border-gray-200'

  const gridCols =
    headerGridClassName ??
    (showSearch
      ? 'md:grid-cols-[minmax(0,1.55fr)_minmax(0,1.1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1.08fr)_minmax(0,0.98fr)]'
      : 'lg:grid-cols-[minmax(0,1fr)_auto]')

  const defaultLeft = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0">
      {leading ? <div className="flex items-center shrink-0">{leading}</div> : null}
      {title.trim() ? (
        <h1
          className={`text-lg sm:text-xl font-semibold tracking-tight shrink-0 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          {title}
        </h1>
      ) : null}
      {showSocialProof ? (
        <div className="min-w-0 w-full flex-1 sm:max-w-none md:max-w-none lg:max-w-[28rem] xl:max-w-[32rem]">
          <RecentPurchaseActivity variant="header" />
        </div>
      ) : null}
    </div>
  )

  return (
    <header
      className={`sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 backdrop-blur-md ${shellBg} ${className}`.trim()}
    >
      <div
        className={`rounded-xl border px-3 py-3 sm:px-4 sm:py-4 shadow-sm ${cardBg}`}
      >
        <div
          className={`flex flex-col gap-2.5 min-w-0 md:grid md:items-center md:gap-4 lg:gap-5 ${gridCols}`}
        >
          <div className="min-w-0 w-full">{leftContent ?? defaultLeft}</div>

          {showSearch ? (
            <div className="flex flex-row items-center gap-1.5 sm:gap-2 min-w-0 w-full md:contents">
              <div
                className={`flex-1 min-w-0 md:border-l md:pl-4 lg:pl-5 flex flex-col justify-center ${borderClass}`}
              >
                <ShopHeroSearch
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={onSearchChange}
                  onSubmit={onSearchSubmit}
                  className={searchClassName}
                  compactOnMobile
                />
              </div>
              <div
                className={`shrink-0 min-w-0 md:border-l md:pl-4 lg:pl-5 flex flex-col justify-center ${borderClass}`}
              >
                {actions}
              </div>
            </div>
          ) : (
            <div
              className={`min-w-0 w-full lg:border-l lg:pl-5 flex flex-col justify-center ${borderClass}`}
            >
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
