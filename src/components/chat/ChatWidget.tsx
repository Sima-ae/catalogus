'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useChat } from '@/components/chat/ChatProvider'
import { useI18n } from '@/lib/i18n-context'
import { resolveWhatsAppContactUrl } from '@/lib/whatsapp'

const FAB_CLASS =
  'h-14 w-14 rounded-full shadow-lg bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center'

type Props = {
  /** On featured storefronts (1-1.club), open WhatsApp instead of live chat. */
  whatsAppOnly?: boolean
}

export default function ChatWidget({ whatsAppOnly = false }: Props) {
  const pathname = usePathname() || ''
  const { open, setOpen } = useChat()
  const { t } = useI18n()

  // Hide the widget on the gate itself to avoid confusing UX.
  const hide = pathname.endsWith('/site-access-gate')
  useEffect(() => {
    if (hide && open) setOpen(false)
  }, [hide, open, setOpen])

  if (hide) return null

  if (whatsAppOnly) {
    const whatsappUrl =
      resolveWhatsAppContactUrl() || 'https://wa.me/31687999505'

    return (
      <div className="fixed bottom-5 right-5 z-[9998]">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={FAB_CLASS}
          aria-label={t('shop.featuredCatalog.whatsapp')}
        >
          <ChatBubbleLeftRightIcon className="h-7 w-7" />
        </a>
      </div>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 z-[9998]">
      <button
        type="button"
        className={FAB_CLASS}
        aria-label={open ? 'Close chat' : 'Open chat'}
        onClick={() => setOpen(!open)}
      >
        {open ? <XMarkIcon className="h-7 w-7" /> : <ChatBubbleLeftRightIcon className="h-7 w-7" />}
      </button>
    </div>
  )
}
