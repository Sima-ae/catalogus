'use client'

import { useMemo } from 'react'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n-context'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'

export default function AppFooter({ showLanguageSwitcher = true }: { showLanguageSwitcher?: boolean }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { t } = useI18n()

  const year = useMemo(() => new Date().getFullYear(), [])

  return (
    <div className="pt-6">
      <div className="border-t border-gray-200 dark:border-dark-800 pt-4 space-y-3">
        <div className={`text-center text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {t('footer.copyright', { year })}
        </div>
        {showLanguageSwitcher ? (
          <div className="flex justify-center">
            <LanguageSwitcher compact />
          </div>
        ) : null}
      </div>
    </div>
  )
}

