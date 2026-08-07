'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n-context'
import { resolveWhatsAppContactUrl } from '@/lib/whatsapp'

type Props = {
  open: boolean
  fullCatalogTotal: number
  onClose: () => void
}

function formatTotal(n: number, locale: string): string {
  if (!Number.isFinite(n) || n <= 0) return '—'
  try {
    return new Intl.NumberFormat(locale).format(Math.floor(n))
  } catch {
    return new Intl.NumberFormat(undefined).format(Math.floor(n))
  }
}

/** Shown on 1-1.club when the visitor pages past the featured catalog. */
export default function FeaturedCatalogExhaustedModal({
  open,
  fullCatalogTotal,
  onClose,
}: Props) {
  const { theme } = useTheme()
  const { t, locale } = useI18n()
  const isDark = theme === 'dark'
  const totalLabel = formatTotal(fullCatalogTotal, locale)

  if (!open) return null

  const prefill = t('shop.featuredCatalog.whatsappPrefill')
  const whatsappUrl =
    resolveWhatsAppContactUrl(prefill) ||
    `https://wa.me/31687999505?text=${encodeURIComponent(prefill)}`

  const panel = isDark
    ? 'bg-dark-800 border-dark-600 text-white'
    : 'bg-white border-gray-200 text-gray-900'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="featured-catalog-exhausted-title"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-md rounded-2xl border p-6 shadow-xl ${panel}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={`absolute right-3 top-3 rounded-full p-1 ${muted} hover:opacity-80`}
          aria-label={t('shop.featuredCatalog.close')}
          onClick={onClose}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        <h2
          id="featured-catalog-exhausted-title"
          className="pr-8 text-[15px] font-semibold leading-snug sm:text-lg sm:leading-normal"
        >
          {t('shop.featuredCatalog.needAllTitle', { total: totalLabel })}
        </h2>
        <p className={`mt-3 text-sm leading-relaxed ${muted}`}>
          {t('shop.featuredCatalog.body')}
        </p>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-6 flex w-full items-center justify-center py-2.5"
        >
          {t('shop.featuredCatalog.whatsapp')}
        </a>
      </div>
    </div>
  )
}
