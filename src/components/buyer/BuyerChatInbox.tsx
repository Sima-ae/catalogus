'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'
import { appPath } from '@/lib/paths'
import ChatQuoteCard, { type ChatQuoteCardData } from '@/components/chat/ChatQuoteCard'
import { useChatMessagePoll } from '@/hooks/useChatMessagePoll'
import { useChatAutoScroll } from '@/hooks/useChatAutoScroll'
import {
  CHAT_INBOX_POLL_MS,
  createOptimisticMessage,
  replaceOptimisticMessage,
  rowToMessageItem,
} from '@/lib/chat-realtime'
import { useChatMessageText } from '@/hooks/useChatMessageText'

type MessageItem = {
  id: string
  sender_role: string
  message_type: string
  body: string | null
  created_at: string
  quote: ChatQuoteCardData | null
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, cache: 'no-store', credentials: 'include' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(String(data?.error || `HTTP_${res.status}`))
  return data
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function BuyerChatInbox() {
  const { t, localizeMessageBody } = useChatMessageText()
  const { user } = useAuth()
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loadingBootstrap, setLoadingBootstrap] = useState(true)
  const [error, setError] = useState('')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const hasConversationRef = useRef(false)

  const loadBootstrap = useCallback(
    async (silent = false) => {
      if (!silent) setLoadingBootstrap(true)
      try {
        const data = await fetchJson(appPath('/api/chat/bootstrap'), {
          headers: catalogAuthHeaders(user),
        })
        setConversationId(data.conversationId ?? null)
        hasConversationRef.current = Boolean(data.conversationId)
        setError('')
      } catch (e) {
        if (!silent) {
          setError(e instanceof Error ? e.message : String(e))
        }
      } finally {
        if (!silent) setLoadingBootstrap(false)
      }
    },
    [user]
  )

  useEffect(() => {
    void loadBootstrap(false)
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      void loadBootstrap(true)
    }
    const timer = setInterval(tick, CHAT_INBOX_POLL_MS)
    return () => clearInterval(timer)
  }, [loadBootstrap])

  const fetchMessages = useCallback(
    async (since: string | null): Promise<MessageItem[]> => {
      if (!conversationId) return []
      const params = new URLSearchParams({ conversationId })
      if (since) params.set('since', since)
      const data = await fetchJson(appPath(`/api/chat/messages?${params.toString()}`), {
        headers: catalogAuthHeaders(user),
      })
      return (data.items ?? []) as MessageItem[]
    },
    [conversationId, user]
  )

  const { messages, setMessages, loading: loadingMessages, loadMessages } =
    useChatMessagePoll<MessageItem>({
      enabled: Boolean(conversationId),
      fetchMessages,
      conversationKey: conversationId,
    })

  const { requestScrollToBottom } = useChatAutoScroll(scrollRef, messages.length, {
    conversationKey: conversationId,
  })

  const sendReply = async () => {
    if (!conversationId || !reply.trim() || sending) return
    const text = reply.trim()
    const optimistic = createOptimisticMessage({ senderRole: 'visitor', body: text })
    setReply('')
    setSending(true)
    setMessages((prev) => [...prev, optimistic as MessageItem])
    requestScrollToBottom()
    try {
      const data = await fetchJson(appPath('/api/chat/messages'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...catalogAuthHeaders(user),
        },
        body: JSON.stringify({ conversationId, text }),
      })
      if (data.message) {
        const confirmed = rowToMessageItem(data.message) as MessageItem
        setMessages((prev) => replaceOptimisticMessage(prev, optimistic.id, confirmed) as MessageItem[])
      } else {
        await loadMessages(false)
      }
    } catch (e) {
      setReply(text)
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-600">{t('buyer.chat.hint')}</p>
      </div>

      {error ? (
        <div className="px-4 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">{error}</div>
      ) : null}

      <section className="flex flex-col min-h-[520px]">
        {loadingBootstrap && !conversationId ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-500 p-8">
            {t('chat.loading')}
          </div>
        ) : !conversationId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3">
            <p className="text-sm text-gray-600 max-w-md">{t('buyer.chat.empty')}</p>
            <Link
              href={appPath('/')}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {t('buyer.nav.browseShop')}
            </Link>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[420px]">
              {loadingMessages && !messages.length ? (
                <div className="text-sm text-gray-500">{t('chat.loading')}</div>
              ) : messages.length ? (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender_role === 'visitor' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 ${
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
                        <div className="text-sm whitespace-pre-wrap">{localizeMessageBody(m.body)}</div>
                      )}
                      <div
                        className={`mt-1 text-[10px] ${
                          m.sender_role === 'visitor' ? 'text-blue-100' : 'text-gray-400'
                        }`}
                      >
                        {formatTime(m.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">{t('chat.ready')}</div>
              )}
            </div>

            <div className="border-t border-gray-200 p-3 flex gap-2">
              <input
                type="text"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void sendReply()
                  }
                }}
                placeholder={t('chat.placeholder')}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => void sendReply()}
                disabled={sending || !reply.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {t('chat.send')}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
