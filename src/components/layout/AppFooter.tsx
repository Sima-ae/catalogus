'use client'

import { useMemo } from 'react'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n-context'
import { useSiteBrand } from '@/lib/site-brand-context'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'

export default function AppFooter({ showLanguageSwitcher = true }: { showLanguageSwitcher?: boolean }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { t } = useI18n()
  const brand = useSiteBrand()

  const year = useMemo(() => new Date().getFullYear(), [])
  const copyright =
    brand.footerCopyright.trim() || t('footer.copyright', { year })
  const menuLines = brand.footerMenu
    ? brand.footerMenu.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    : []

  return (
    <div className="pt-6">
      <div className="border-t border-gray-200 dark:border-dark-800 pt-4 space-y-3">
        {menuLines.length > 0 ? (
          <div className={`text-center text-xs space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {menuLines.map((line, idx) => (
              <div key={`${idx}-${line}`}>{line}</div>
            ))}
          </div>
        ) : null}
        <div className={`text-center text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {copyright}
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
