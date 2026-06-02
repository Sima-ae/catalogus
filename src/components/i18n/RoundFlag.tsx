'use client'

import { appPath } from '@/lib/paths'
import { getLocaleFlag } from '@/lib/i18n-locale-registry'

type Props = {
  code: string
  size?: number
  className?: string
}

/** Circular country flag (same treatment as inkoop.autos language picker). */
export function RoundFlag({ code, size = 24, className = '' }: Props) {
  const flag = getLocaleFlag(code)
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local SVG; reliable circle clip on mobile
    <img
      src={appPath(`/flags/${flag}.svg`)}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-full object-cover bg-gray-100 ring-1 ring-black/10 ${className}`}
      style={{ width: size, height: size }}
      loading="lazy"
      decoding="async"
    />
  )
}
