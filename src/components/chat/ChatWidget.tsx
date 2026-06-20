'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useChat } from '@/components/chat/ChatProvider'

export default function ChatWidget() {
  const pathname = usePathname() || ''
  const { open, setOpen } = useChat()

  // Hide the widget on the gate itself to avoid confusing UX.
  const hide = pathname.endsWith('/site-access-gate')
  useEffect(() => {
    if (hide && open) setOpen(false)
  }, [hide, open, setOpen])

  if (hide) return null

  return (
    <div className="fixed bottom-5 right-5 z-[9998]">
      <button
        type="button"
        className="h-14 w-14 rounded-full shadow-lg bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center"
        aria-label={open ? 'Close chat' : 'Open chat'}
        onClick={() => setOpen(!open)}
      >
        {open ? <XMarkIcon className="h-7 w-7" /> : <ChatBubbleLeftRightIcon className="h-7 w-7" />}
      </button>
    </div>
  )
}

