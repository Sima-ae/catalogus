'use client'

import { RoundFlag } from '@/components/i18n/RoundFlag'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/i18n'
import { useI18n } from '@/lib/i18n-context'
import { useLanguagePicker } from '@/lib/language-picker-context'

type Props = {
  compact?: boolean
  /** Icon-only on viewports below `sm` (fits crowded mobile headers). */
  iconOnlyOnMobile?: boolean
  /** Full-width row for the shop sidebar (mobile / tablet menu). */
  variant?: 'header' | 'sidebar'
}

/** Opens the centered language picker modal (shared with header, footer & sidebar). */
export default function LanguageSwitcher({
  compact = false,
  iconOnlyOnMobile = false,
  variant = 'header',
}: Props) {
  const { locale, t } = useI18n()
  const { openPicker } = useLanguagePicker()

  const currentCode =
    SUPPORTED_LOCALES.find((l) => l === locale) ?? DEFAULT_LOCALE

  const flagSize = variant === 'sidebar' ? 22 : compact ? 18 : 20

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        onClick={openPicker}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm sm:text-base font-medium transition-colors text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-dark-800 dark:hover:text-white"
        aria-label={t('language.chooseTitle')}
        aria-haspopup="dialog"
      >
        <RoundFlag code={currentCode} size={flagSize} />
        <span>{t('language.menu')}</span>
      </button>
    )
  }

  const btnClass = compact
    ? 'h-9 px-2 gap-1.5 text-xs shrink-0'
    : 'h-10 px-3 gap-2 text-sm shrink-0'

  const codeClass =
    iconOnlyOnMobile ? 'font-medium max-sm:sr-only' : 'font-medium'

  return (
    <button
      type="button"
      onClick={openPicker}
      className={`inline-flex items-center rounded-lg border border-gray-200 dark:border-dark-700 bg-white/70 dark:bg-dark-900/60 backdrop-blur transition-colors hover:bg-white dark:hover:bg-dark-800 ${btnClass} ${
        iconOnlyOnMobile ? 'max-sm:px-1.5 max-sm:min-w-[2.25rem] max-sm:justify-center' : ''
      }`}
      aria-label={t('language.chooseTitle')}
      aria-haspopup="dialog"
    >
      <RoundFlag code={currentCode} size={flagSize} />
      <span className={codeClass}>{currentCode.toUpperCase()}</span>
    </button>
  )
}
