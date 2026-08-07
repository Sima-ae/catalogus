'use client'

import { useEffect, useState } from 'react'
import { ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useChat } from '@/components/chat/ChatProvider'
import { useTheme } from '@/lib/theme'
import { resolveWhatsAppContactUrl } from '@/lib/whatsapp'

type Props = {
  open: boolean
  fullCatalogTotal: number
  onClose: () => void
}

function formatTotal(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return 'all'
  return new Intl.NumberFormat(undefined).format(Math.floor(n))
}

/** Shown on 1-1.club when the visitor pages past the featured catalog. */
export default function FeaturedCatalogExhaustedModal({
  open,
  fullCatalogTotal,
  onClose,
}: Props) {
  const { theme } = useTheme()
  const { setOpen: setChatOpen } = useChat()
  const [showChoices, setShowChoices] = useState(false)
  const isDark = theme === 'dark'
  const totalLabel = formatTotal(fullCatalogTotal)

  useEffect(() => {
    if (open) setShowChoices(false)
  }, [open])

  if (!open) return null

  const prefill = `Hi! I'd like to see the full Super Clones catalog (${totalLabel} products).`
  const whatsappUrl = resolveWhatsAppContactUrl(prefill)

  const panel = isDark
    ? 'bg-dark-800 border-dark-600 text-white'
    : 'bg-white border-gray-200 text-gray-900'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'
  const choiceBtn = isDark
    ? 'border-dark-600 bg-dark-900 hover:bg-dark-700 text-white'
    : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-900'

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
          aria-label="Close"
          onClick={onClose}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        <h2 id="featured-catalog-exhausted-title" className="pr-8 text-lg font-semibold">
          Need to see all {totalLabel} products?
        </h2>
        <p className={`mt-3 text-sm leading-relaxed ${muted}`}>
          This page only shows featured picks. To browse the full Super Clones catalog (
          {totalLabel} products), send us a message in live chat or on WhatsApp.
        </p>

        {!showChoices ? (
          <button
            type="button"
            className="btn-primary mt-6 w-full py-2.5"
            onClick={() => setShowChoices(true)}
          >
            Click here
          </button>
        ) : (
          <div className="mt-6 flex flex-col gap-2.5">
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${choiceBtn}`}
              >
                Send on WhatsApp
              </a>
            ) : null}
            <button
              type="button"
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${choiceBtn}`}
              onClick={() => {
                onClose()
                setChatOpen(true)
              }}
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
              Send on Live Chat
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
