'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n-context'
import { useLanguagePicker } from '@/lib/language-picker-context'
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n'

export default function LanguageSwitcherModal() {
  const { open, closePicker } = useLanguagePicker()
  const { locale, setLocale, t } = useI18n()
  const router = useRouter()
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
    if (next !== locale) {
      setLocale(next)
      router.refresh()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-picker-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label={t('language.close')}
        onClick={closePicker}
      />

      <div
        className={`relative z-10 w-full max-w-lg rounded-2xl border shadow-2xl ${shellClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5 ${
            isDark ? 'border-dark-700' : 'border-gray-200'
          }`}
        >
          <h2 id="language-picker-title" className="text-base sm:text-lg font-semibold">
            {t('language.chooseTitle')}
          </h2>
          <button
            type="button"
            onClick={closePicker}
            className={`rounded-lg p-2 transition-colors ${
              isDark ? 'hover:bg-dark-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}
            aria-label={t('language.close')}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[min(60vh,28rem)] overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
            {SUPPORTED_LOCALES.map((code) => {
              const label = t(`language.${code}`)
              const active = code === locale
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => selectLocale(code)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors ${
                    active
                      ? 'border-primary-500 bg-primary-500/10 ring-2 ring-primary-500/40'
                      : isDark
                        ? 'border-dark-600 hover:border-dark-500 hover:bg-dark-800'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Image
                    src={`/flags/${code}.svg`}
                    alt=""
                    width={32}
                    height={32}
                    className="rounded-sm shadow-sm"
                  />
                  <span className={`text-xs sm:text-sm leading-tight ${active ? 'font-semibold' : ''}`}>
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
