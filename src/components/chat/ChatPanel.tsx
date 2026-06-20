'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '@/components/chat/ChatProvider'
import ChatQuoteCard, { type ChatQuoteCardData } from '@/components/chat/ChatQuoteCard'
import ChatSupplierPanel from '@/components/chat/ChatSupplierPanel'
import { useChatMessagePoll } from '@/hooks/useChatMessagePoll'
import { useChatAutoScroll } from '@/hooks/useChatAutoScroll'
import { useChatMessageText } from '@/hooks/useChatMessageText'
import {
  createOptimisticMessage,
  replaceOptimisticMessage,
  rowToMessageItem,
} from '@/lib/chat-realtime'
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

function quotedProductIds(messages: MessageItem[]): Set<string> {
  const ids = new Set<string>()
  for (const m of messages) {
    const pid = m.quote?.product_id?.trim()
    if (pid) ids.add(pid)
  }
  return ids
}

export default function ChatPanel() {
  const { t } = useI18n()
  const { localizeMessageBody } = useChatMessageText()
  const { user } = useAuth()
  const { open, loading, error, bootstrap, quoteQueue, dequeueQuote } = useChat()
  const [quoteError, setQuoteError] = useState('')
  const [sendingQuote, setSendingQuote] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const quoteQueueRef = useRef<string[]>([])
  const messagesRef = useRef<MessageItem[]>([])
  const pumpingRef = useRef(false)

  const conversationId = bootstrap?.conversationId ?? null
  const isSupplier = bootstrap?.chatRole === 'pricelist_supplier'
  const canPoll = Boolean(conversationId) && open && !isSupplier

  const fetchMessages = useCallback(
    async (since: string | null): Promise<MessageItem[]> => {
      if (!conversationId) return []
      const params = new URLSearchParams({ conversationId })
      if (since) params.set('since', since)
      const res = await fetch(appPath(`/api/chat/messages?${params.toString()}`), {
        credentials: 'include',
        cache: 'no-store',
        headers: catalogAuthHeaders(user),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !Array.isArray(data.items)) return []
      return data.items as MessageItem[]
    },
    [conversationId, user]
  )

  const { messages, loading: loadingMessages, loadMessages, setMessages } =
    useChatMessagePoll<MessageItem>({
      enabled: canPoll,
      fetchMessages,
      conversationKey: conversationId,
    })

  quoteQueueRef.current = quoteQueue
  messagesRef.current = messages

  const { requestScrollToBottom } = useChatAutoScroll(scrollRef, messages.length, {
    conversationKey: conversationId,
  })

  const pumpQuoteQueue = useCallback(async () => {
    if (!open || !conversationId || pumpingRef.current) return
    if (quoteQueueRef.current.length === 0) return

    pumpingRef.current = true
    setSendingQuote(true)
    setQuoteError('')

    try {
      const quoted = quotedProductIds(messagesRef.current)
      while (quoteQueueRef.current.length > 0) {
        const productId = quoteQueueRef.current[0]
        if (!productId) break

        if (quoted.has(productId)) {
          dequeueQuote(productId)
          continue
        }

        const res = await fetch(appPath('/api/chat/quotes'), {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            ...catalogAuthHeaders(user),
          },
          body: JSON.stringify({ conversationId, productId }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(String(data?.error || `HTTP_${res.status}`))

        quoted.add(productId)
        dequeueQuote(productId)
        await loadMessages(false)
        requestScrollToBottom()
      }
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : String(e))
    } finally {
      pumpingRef.current = false
      setSendingQuote(false)
      if (quoteQueueRef.current.length > 0) {
        void pumpQuoteQueue()
      }
    }
  }, [open, conversationId, dequeueQuote, user, loadMessages, requestScrollToBottom])

  useEffect(() => {
    if (!open || !conversationId || quoteQueue.length === 0) return
    void pumpQuoteQueue()
  }, [open, conversationId, quoteQueue.length, quoteQueue[0], pumpQuoteQueue])

  const sendingQuoteLabel = useMemo(() => {
    if (!sendingQuote) return null
    const remaining = quoteQueue.length
    if (remaining > 1) {
      return t('chat.sendingQuotes', { count: remaining })
    }
    return t('chat.sendingQuote')
  }, [sendingQuote, quoteQueue.length, t])

  const messageList = useMemo(() => {
    if (!messages.length) return null
    return (
      <div className="space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender_role === 'visitor' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                m.sender_role === 'visitor'
                  ? 'bg-blue-600 text-white'
                  : m.sender_role === 'admin'
                    ? 'bg-gray-100 text-gray-900'
                    : 'bg-gray-50 text-gray-700'
              } ${m.id.startsWith('pending-') ? 'opacity-80' : ''}`}
            >
              {m.message_type === 'quote' && m.quote ? (
                <ChatQuoteCard quote={m.quote} compact />
              ) : (
                <div className="whitespace-pre-wrap">{localizeMessageBody(m.body)}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }, [messages])

  const sendMessage = async () => {
    if (!conversationId || !reply.trim() || sending) return
    const text = reply.trim()
    const optimistic = createOptimisticMessage({ senderRole: 'visitor', body: text })
    setReply('')
    setSending(true)
    setMessages((prev) => [...prev, optimistic as MessageItem])
    requestScrollToBottom()
    try {
      const res = await fetch(appPath('/api/chat/messages'), {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...catalogAuthHeaders(user),
        },
        body: JSON.stringify({ conversationId, text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(String(data?.error || `HTTP_${res.status}`))
      if (data.message) {
        const confirmed = rowToMessageItem(data.message) as MessageItem
        setMessages((prev) => replaceOptimisticMessage(prev, optimistic.id, confirmed) as MessageItem[])
      } else {
        await loadMessages(false)
      }
    } catch {
      setReply(text)
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed bottom-24 right-5 z-[9998] w-[min(92vw,380px)]">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[min(70vh,520px)]">
        {isSupplier ? (
          <ChatSupplierPanel />
        ) : (
          <>
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 shrink-0">
              <div className="font-semibold text-gray-900">{t('chat.title')}</div>
              <div className="text-xs text-gray-500">{t('chat.subtitle')}</div>
            </div>

            <div ref={scrollRef} className="p-4 text-sm text-gray-700 flex-1 overflow-y-auto min-h-[180px]">
              {loading && !bootstrap ? (
                <div className="text-gray-500">{t('chat.loading')}</div>
              ) : quoteError ? (
                <div className="text-red-600">{quoteError}</div>
              ) : error ? (
                <div className="text-red-600">{error}</div>
              ) : bootstrap?.conversationId ? (
                <div className="text-gray-600">
                  {sendingQuoteLabel ? (
                    <div className="text-gray-500 mb-2">{sendingQuoteLabel}</div>
                  ) : null}
                  {loadingMessages && !messages.length ? (
                    <div className="text-gray-500 mb-2">{t('chat.loading')}</div>
                  ) : null}
                  {messageList ?? <div className="text-gray-500">{t('chat.ready')}</div>}
                </div>
              ) : (
                <div className="text-gray-600">{t('chat.notAvailable')}</div>
              )}
            </div>

            {bootstrap?.conversationId ? (
              <div className="px-3 py-3 border-t border-gray-200 bg-white shrink-0 flex gap-2">
                <input
                  type="text"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void sendMessage()
                    }
                  }}
                  placeholder={t('chat.placeholder')}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={sending || !reply.trim()}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {t('chat.send')}
                </button>
              </div>
            ) : (
              <div className="px-4 py-3 border-t border-gray-200 bg-white shrink-0">
                <div className="text-xs text-gray-500">{t('chat.v1Hint')}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
