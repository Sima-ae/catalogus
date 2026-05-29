'use client'

import { useTheme } from '@/lib/theme'

/** Shared Tailwind class sets for light / dark UI (neutral greys, no blue slate). */
export function useAppTheme() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return {
    isDark,
    page: isDark ? 'bg-dark-950' : 'bg-gray-50',
    surface: isDark ? 'bg-dark-900' : 'bg-white',
    surfaceMuted: isDark ? 'bg-dark-800' : 'bg-gray-100',
    border: isDark ? 'border-dark-800' : 'border-gray-200',
    heading: isDark ? 'text-gray-50' : 'text-gray-900',
    body: isDark ? 'text-gray-200' : 'text-gray-800',
    muted: isDark ? 'text-gray-400' : 'text-gray-600',
    tableHead: isDark ? 'text-gray-300' : 'text-gray-700',
    tableCell: isDark ? 'text-gray-100' : 'text-gray-900',
    tableCellMuted: isDark ? 'text-gray-300' : 'text-gray-700',
    rowBorder: isDark ? 'border-dark-800' : 'border-gray-200',
    rowHover: isDark ? 'hover:bg-dark-800/80' : 'hover:bg-gray-50',
    iconBtn: isDark
      ? 'hover:bg-dark-800 text-gray-400 hover:text-gray-200'
      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900',
    input: isDark
      ? 'bg-dark-800 border-dark-700 text-gray-100 placeholder-gray-500'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400',
  }
}
