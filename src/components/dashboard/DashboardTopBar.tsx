'use client'

import ThemeToggleButton from '@/components/theme/ThemeToggleButton'
import { useTheme } from '@/lib/theme'

type DashboardTopBarProps = {
  title: string
  children?: React.ReactNode
}

/** Top bar for buyer/seller dashboards — matches shop header actions. */
export default function DashboardTopBar({ title, children }: DashboardTopBarProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <header
      className={`border-b px-4 sm:px-6 py-4 transition-colors duration-200 ${
        isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h1
          className={`text-lg sm:text-xl font-semibold truncate ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          {title}
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          {children}
          <ThemeToggleButton />
        </div>
      </div>
    </header>
  )
}
