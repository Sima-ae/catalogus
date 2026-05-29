'use client'

import Image from 'next/image'
import Link from 'next/link'
import { APP_LOGO_PATH, APP_LOGO_PATH_WHITE, APP_LOGO_PATH_WHITE_CENTERED, APP_NAME } from '@/lib/brand'
import { appPath } from '@/lib/paths'
import { useTheme } from '@/lib/theme'

type BrandLogoSize = 'default' | 'dashboard'

type BrandLogoProps = {
  /** Collapsed sidebar: icon-only width */
  compact?: boolean
  /** Larger logo for admin / buyer / seller dashboard sidebars */
  size?: BrandLogoSize
  /**
   * Sidebars on a dark background (admin dashboards, shop in dark mode).
   * Uses /WEBLOGO-TEXT-WHITE.png; otherwise /WEBLOGO-TEXT-BLACK.png.
   */
  dashboardSidebar?: boolean
  /** Site access gate only — centered white logo asset */
  centered?: boolean
  className?: string
  href?: string
  priority?: boolean
}

const SIZE_PX: Record<BrandLogoSize, { height: number; maxWidth: string; width: number }> = {
  default: { height: 44, maxWidth: '14rem', width: 180 },
  dashboard: { height: 56, maxWidth: '17rem', width: 220 },
}

export default function BrandLogo({
  compact = false,
  size = 'default',
  dashboardSidebar = false,
  centered = false,
  className = '',
  href = '/',
  priority = false,
}: BrandLogoProps) {
  const { theme } = useTheme()
  const dims = SIZE_PX[size]
  const imgHeight = compact ? 40 : dims.height

  // Homepage/catalog: white logo in dark mode; admin sidebars always use white on dark UI
  const useWhiteLogo = dashboardSidebar || theme === 'dark'
  const src = centered
    ? APP_LOGO_PATH_WHITE_CENTERED
    : useWhiteLogo
      ? APP_LOGO_PATH_WHITE
      : APP_LOGO_PATH

  const img = (
    <Image
      key={src}
      src={src}
      alt={APP_NAME}
      width={compact ? 48 : dims.width}
      height={compact ? 40 : dims.height}
      priority={priority}
      className={`w-auto object-contain ${centered ? 'object-center' : 'object-left'} ${
        compact
          ? 'max-w-[3rem]'
          : size === 'dashboard'
            ? 'max-w-[17rem]'
            : 'max-w-[12rem] sm:max-w-[14rem]'
      }`}
      style={{
        width: 'auto',
        height: imgHeight,
        maxWidth: compact ? '3rem' : dims.maxWidth,
      }}
    />
  )

  const inner = (
    <span className={`inline-flex items-center shrink-0 ${className}`}>{img}</span>
  )

  if (href) {
    return (
      <Link
        href={appPath(href)}
        className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
      >
        {inner}
      </Link>
    )
  }

  return inner
}
