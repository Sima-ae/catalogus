'use client'

import { useTheme } from '@/lib/theme'

type Props = {
  centered?: boolean
  count?: number
}

const DEFAULT_WIDTHS = [72, 96, 88, 104, 80, 92]

export default function FilterPillsSkeleton({ centered = false, count = 6 }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const pillClass = isDark ? 'bg-dark-700' : 'bg-gray-200'
  const widths = DEFAULT_WIDTHS.slice(0, count)

  return (
    <div
      className={`flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-hidden py-1 ${
        centered ? 'justify-center px-2' : 'justify-start'
      }`}
      aria-hidden
    >
      {widths.map((width, index) => (
        <div
          key={index}
          className={`h-9 shrink-0 animate-pulse rounded-full ${pillClass}`}
          style={{ width }}
        />
      ))}
    </div>
  )
}
