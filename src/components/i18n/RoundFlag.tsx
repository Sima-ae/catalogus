'use client'

import Image from 'next/image'

type Props = {
  code: string
  size?: number
  className?: string
}

/** Circular country flag (same treatment as inkoop.autos language picker). */
export function RoundFlag({ code, size = 24, className = '' }: Props) {
  return (
    <span
      className={`relative shrink-0 overflow-hidden rounded-full bg-gray-100 ring-1 ring-black/10 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Image
        src={`/flags/${code}.svg`}
        alt=""
        fill
        className="object-cover"
        sizes={`${size}px`}
      />
    </span>
  )
}
