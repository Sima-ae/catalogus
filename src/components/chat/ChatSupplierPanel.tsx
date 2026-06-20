'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useChat } from '@/components/chat/ChatProvider'
import ChatQuoteCard, { type ChatQuoteCardData } from '@/components/chat/ChatQuoteCard'
import ChatQuoteProductModal from '@/components/chat/ChatQuoteProductModal'
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

export default function ChatSupplierPanel() {
  const { t } = useI18n()
  const { localizeMessageBody } = useChatMessageText()
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

  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [activeQuote, setActiveQuote] = useState<ChatQuoteCardData | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const threads = bootstrap?.supplierThreads ?? []
  const threadId = selectedSupplierThreadId

  const ownerQuery = useMemo(() => {
    const params = new URLSearchParams()
    if (pricelistOwnerParam) params.set('owner', pricelistOwnerParam)
    const q = params.toString()
    return q ? `?${q}` : ''
  }, [pricelistOwnerParam])

  const fetchMessages = useCallback(
    async (since: string | null): Promise<MessageItem[]> => {
      if (!threadId) return []
      const params = new URLSearchParams()
      if (pricelistOwnerParam) params.set('owner', pricelistOwnerParam)
      if (since) params.set('since', since)
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
      if (!res.ok || !Array.isArray(data.items)) return []
      return data.items as MessageItem[]
    },
    [threadId, pricelistOwnerParam, user]
  )

  const { messages, loading: loadingMessages, loadMessages, setMessages } = useChatMessagePoll<MessageItem>({
    enabled: Boolean(threadId),
    fetchMessages,
    conversationKey: threadId,
  })

  const { requestScrollToBottom } = useChatAutoScroll(scrollRef, messages.length, {
    conversationKey: threadId,
  })

  const sendMessage = async (text: string) => {
    if (!threadId || !text.trim() || sending) return
    const trimmed = text.trim()
    const optimistic = createOptimisticMessage({ senderRole: 'seller', body: trimmed })
    setSending(true)
    setMessages((prev) => [...prev, optimistic as MessageItem])
    requestScrollToBottom()
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
          body: JSON.stringify({ text: trimmed }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(String(data?.error || `HTTP_${res.status}`))
      setReply('')
      if (data.message) {
        const confirmed = rowToMessageItem(data.message) as MessageItem
        setMessages((prev) => replaceOptimisticMessage(prev, optimistic.id, confirmed) as MessageItem[])
      } else {
        await loadMessages(false)
      }
      void refreshBootstrap({ silent: true })
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
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
              } ${m.id.startsWith('pending-') ? 'opacity-80' : ''}`}
            >
              {m.message_type === 'quote' && m.quote ? (
                <ChatQuoteCard quote={m.quote} compact onClick={() => setActiveQuote(m.quote)} />
              ) : (
                <div className="whitespace-pre-wrap px-1">{localizeMessageBody(m.body)}</div>
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
        {loading && !bootstrap ? (
          <div className="text-gray-500">{t('chat.loading')}</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : threadId ? (
          loadingMessages && !messages.length ? (
            <div className="text-gray-500">{t('chat.loading')}</div>
          ) : (
            messageList ?? (
              <div className="text-gray-500">
                {threads.length ? t('chat.ready') : t('chat.noSupplierThreads')}
              </div>
            )
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
