'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '@/components/chat/ChatProvider'
import ChatQuoteCard, { type ChatQuoteCardData } from '@/components/chat/ChatQuoteCard'
import ChatQuoteProductModal from '@/components/chat/ChatQuoteProductModal'
import { useI18n } from '@/lib/i18n-context'
import { appPath } from '@/lib/paths'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'

type MessageItem = {
  id: string
  sender_role: string
  message_type: string
  body: string | null
  created_at: string
  quote: ChatQuoteCardData | null
}

export default function ChatSupplierPanel() {
  const { t } = useI18n()
  const { user } = useAuth()
  const {
    bootstrap,
    loading,
    error,
    pricelistOwnerParam,
    selectedSupplierThreadId,
    setSelectedSupplierThreadId,
    refreshBootstrap,
  } = useChat()

  const [messages, setMessages] = useState<MessageItem[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [activeQuote, setActiveQuote] = useState<ChatQuoteCardData | null>(null)
  const lastTsRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const threads = bootstrap?.supplierThreads ?? []
  const threadId = selectedSupplierThreadId

  const ownerQuery = useMemo(() => {
    const params = new URLSearchParams()
    if (pricelistOwnerParam) params.set('owner', pricelistOwnerParam)
    const q = params.toString()
    return q ? `?${q}` : ''
  }, [pricelistOwnerParam])

  const loadMessages = useCallback(
    async (reset = false) => {
      if (!threadId) return
      try {
        const params = new URLSearchParams()
        if (pricelistOwnerParam) params.set('owner', pricelistOwnerParam)
        if (!reset && lastTsRef.current) params.set('since', lastTsRef.current)
        const suffix = params.toString() ? `?${params.toString()}` : ''
        const res = await fetch(
          appPath(`/api/chat/supplier/conversations/${threadId}/messages${suffix}`),
          {
            credentials: 'include',
            cache: 'no-store',
            headers: catalogAuthHeaders(user),
          }
        )
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !Array.isArray(data.items)) return
        const items = data.items as MessageItem[]
        if (reset) {
          setMessages(items)
        } else if (items.length) {
          setMessages((prev) => [...prev, ...items])
        }
        if (items.length) {
          lastTsRef.current = items[items.length - 1]?.created_at ?? lastTsRef.current
        } else if (reset) {
          lastTsRef.current = null
        }
      } catch {
        // retry on next poll
      }
    },
    [threadId, pricelistOwnerParam, user]
  )

  useEffect(() => {
    if (!threadId) {
      setMessages([])
      lastTsRef.current = null
      return
    }
    void loadMessages(true)
    const timer = setInterval(() => void loadMessages(false), 4000)
    return () => clearInterval(timer)
  }, [threadId, loadMessages])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!threadId || !text.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(
        appPath(`/api/chat/supplier/conversations/${threadId}/messages${ownerQuery}`),
        {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            ...catalogAuthHeaders(user),
          },
          body: JSON.stringify({ text: text.trim() }),
        }
      )
      if (!res.ok) return
      setReply('')
      await loadMessages(true)
      void refreshBootstrap()
    } finally {
      setSending(false)
    }
  }

  const messageList = useMemo(() => {
    if (!messages.length) return null
    return (
      <div className="space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender_role === 'seller' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[92%] rounded-xl px-2 py-2 text-sm ${
                m.sender_role === 'seller'
                  ? 'bg-emerald-600 text-white'
                  : m.sender_role === 'system'
                    ? 'bg-gray-100 text-gray-600 italic text-xs'
                    : 'bg-gray-100 text-gray-900'
              }`}
            >
              {m.message_type === 'quote' && m.quote ? (
                <ChatQuoteCard
                  quote={m.quote}
                  compact
                  onClick={() => setActiveQuote(m.quote)}
                />
              ) : (
                <div className="whitespace-pre-wrap px-1">{m.body}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }, [messages])

  return (
    <>
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 shrink-0">
        <div className="font-semibold text-gray-900">
          {bootstrap?.displayLabel || t('chat.supplierTitle')}
        </div>
        <div className="text-xs text-gray-500">{t('chat.supplierSubtitle')}</div>
      </div>

      {threads.length > 1 ? (
        <div className="px-3 py-2 border-b border-gray-100 flex gap-2 overflow-x-auto">
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setSelectedSupplierThreadId(thread.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs border ${
                threadId === thread.id
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              {thread.productName ?? t('chat.selectThread')}
            </button>
          ))}
        </div>
      ) : null}

      <div ref={scrollRef} className="p-4 text-sm text-gray-700 flex-1 overflow-y-auto min-h-[180px]">
        {loading ? (
          <div className="text-gray-500">{t('chat.loading')}</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : threadId ? (
          messageList ?? (
            <div className="text-gray-500">
              {threads.length ? t('chat.ready') : t('chat.noSupplierThreads')}
            </div>
          )
        ) : (
          <div className="text-gray-500">{t('chat.noSupplierThreads')}</div>
        )}
      </div>

      {threadId ? (
        <div className="px-3 py-3 border-t border-gray-200 bg-white shrink-0 flex gap-2">
          <input
            type="text"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void sendMessage(reply)
              }
            }}
            placeholder={t('chat.placeholder')}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={() => void sendMessage(reply)}
            disabled={sending || !reply.trim()}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {t('chat.send')}
          </button>
        </div>
      ) : null}

      {activeQuote ? (
        <ChatQuoteProductModal
          open={Boolean(activeQuote)}
          quote={activeQuote}
          onClose={() => setActiveQuote(null)}
          onSendPrice={(text) => void sendMessage(text)}
          sending={sending}
        />
      ) : null}
    </>
  )
}
