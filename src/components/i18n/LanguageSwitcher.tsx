'use client'

import { RoundFlag } from '@/components/i18n/RoundFlag'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/i18n'
import { useI18n } from '@/lib/i18n-context'
import { useLanguagePicker } from '@/lib/language-picker-context'

type Props = {
  compact?: boolean
}

/** Opens the centered language picker modal (shared with header & footer triggers). */
export default function LanguageSwitcher({ compact = false }: Props) {
  const { locale, t } = useI18n()
  const { openPicker } = useLanguagePicker()

  const currentCode =
    SUPPORTED_LOCALES.find((l) => l === locale) ?? DEFAULT_LOCALE

  const btnClass = compact
    ? 'h-9 px-2 gap-1.5 text-xs'
    : 'h-10 px-3 gap-2 text-sm'

  return (
    <button
      type="button"
      onClick={openPicker}
      className={`inline-flex items-center rounded-lg border border-gray-200 dark:border-dark-700 bg-white/70 dark:bg-dark-900/60 backdrop-blur px-3 transition-colors hover:bg-white dark:hover:bg-dark-800 ${btnClass}`}
      aria-label={t('language.chooseTitle')}
      aria-haspopup="dialog"
    >
      <RoundFlag code={currentCode} size={18} />
      <span className="font-medium">{currentCode.toUpperCase()}</span>
    </button>
  )
}
