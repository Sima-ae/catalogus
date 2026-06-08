'use client'

import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n-context'

/** Welcome heading shown in side menus below the catalog badge. */
export default function SidebarWelcomeTitle() {
  const { theme } = useTheme()
  const { t } = useI18n()
  const isDark = theme === 'dark'

  return (
    <p
      className={`text-lg font-bold tracking-tight ${
        isDark ? 'text-white' : 'text-gray-900'
      }`}
    >
      {t('shop.home.title')}
    </p>
  )
}
