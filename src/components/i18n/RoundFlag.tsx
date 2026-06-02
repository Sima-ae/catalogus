'use client'

import { appPath } from '@/lib/paths'

type Props = {
  code: string
  size?: number
  className?: string
}

/** Circular country flag (same treatment as inkoop.autos language picker). */
export function RoundFlag({ code, size = 24, className = '' }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local SVG; reliable circle clip on mobile
    <img
      src={appPath(`/flags/${code}.svg`)}
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
