'use client'

import Image from 'next/image'
import Link from 'next/link'
import { APP_LOGO_PATH, APP_NAME } from '@/lib/brand'
import { appPath } from '@/lib/paths'

type BrandLogoProps = {
  /** Collapsed sidebar: icon-only width */
  compact?: boolean
  className?: string
  href?: string
  priority?: boolean
}

export default function BrandLogo({
  compact = false,
  className = '',
  href = '/',
  priority = false,
}: BrandLogoProps) {
  const width = compact ? 40 : 160
  const height = compact ? 40 : 40

  const img = (
    <Image
      src={APP_LOGO_PATH}
      alt={APP_NAME}
      width={width}
      height={height}
      priority={priority}
      className={`h-8 w-auto object-contain object-left ${compact ? 'max-w-[2.5rem]' : 'max-w-[10rem] sm:max-w-[12rem]'}`}
      style={{ width: 'auto', height: compact ? 32 : 36 }}
    />
  )

  const inner = (
    <span className={`inline-flex items-center shrink-0 ${className}`}>{img}</span>
  )

  if (href) {
    return (
      <Link href={appPath(href)} className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded">
        {inner}
      </Link>
    )
  }

  return inner
}
