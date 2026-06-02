'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { RoundFlag } from '@/components/i18n/RoundFlag'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n-context'
import { useLanguagePicker } from '@/lib/language-picker-context'
import { type Locale } from '@/lib/i18n'
import {
  LOCALE_REGISTRY,
  LOCALE_PICKER_ROWS,
  getLocaleNativeName,
} from '@/lib/i18n-locale-registry'
import { localizedPath, parseLocaleFromPathname } from '@/lib/i18n-routing'

export default function LanguageSwitcherModal() {
  const { open, closePicker } = useLanguagePicker()
  const { locale, setLocale, t } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePicker()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, closePicker])

  if (!open || typeof document === 'undefined') return null

  const shellClass = isDark
    ? 'bg-dark-900 border-dark-600 text-white'
    : 'bg-white border-gray-200 text-gray-900'

  const selectLocale = (next: Locale) => {
    closePicker()
    const { pathnameWithoutLocale } = parseLocaleFromPathname(pathname ?? '/')
    const query = searchParams.toString()
    const target =
      localizedPath(pathnameWithoutLocale, next) + (query ? `?${query}` : '')
    setLocale(next)
    if (next !== locale || target !== pathname) {
      router.push(target)
    } else {
      router.refresh()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-start justify-center overflow-y-auto p-3 pt-4 sm:p-4 sm:pt-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-picker-title"
    >
      <button
        type="button"
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        aria-label={t('language.close')}
        onClick={closePicker}
      />

      <div
        className={`relative z-10 w-full max-w-2xl shrink-0 rounded-2xl border shadow-2xl ${shellClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2 sm:px-4 ${
            isDark ? 'border-dark-700' : 'border-gray-200'
          }`}
        >
          <h2 id="language-picker-title" className="text-sm sm:text-base font-semibold">
            {t('language.chooseTitle')}
          </h2>
          <button
            type="button"
            onClick={closePicker}
            className={`rounded-lg p-1.5 transition-colors ${
              isDark ? 'hover:bg-dark-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}
            aria-label={t('language.close')}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="p-2.5 sm:p-3">
          <div
            className="grid grid-cols-3 gap-0.5 sm:gap-1"
            style={{
              gridTemplateRows: `repeat(${LOCALE_PICKER_ROWS}, minmax(2rem, auto))`,
            }}
          >
            {LOCALE_REGISTRY.map(({ code }) => {
              const label = getLocaleNativeName(code)
              const active = code === locale
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => selectLocale(code)}
                  title={label}
                  className={`flex w-full min-h-[2rem] items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors touch-manipulation sm:min-h-[2.125rem] sm:gap-2 sm:px-2 ${
                    active
                      ? isDark
                        ? 'bg-primary-500/20 text-white'
                        : 'bg-emerald-50 text-emerald-950'
                      : isDark
                        ? 'text-gray-200 hover:bg-dark-800 active:bg-dark-700'
                        : 'text-gray-800 hover:bg-gray-100 active:bg-gray-200'
                  }`}
                >
                  <RoundFlag code={code} size={22} />
                  <span
                    className={`min-w-0 flex-1 truncate text-xs leading-tight sm:text-[13px] ${active ? 'font-semibold' : 'font-medium'}`}
                  >
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
