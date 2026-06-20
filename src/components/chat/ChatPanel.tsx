'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '@/components/chat/ChatProvider'
import ChatQuoteCard, { type ChatQuoteCardData } from '@/components/chat/ChatQuoteCard'
import ChatSupplierPanel from '@/components/chat/ChatSupplierPanel'
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

export default function ChatPanel() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { open, loading, error, bootstrap, pendingQuote, clearPendingQuote } = useChat()
  const [quoteError, setQuoteError] = useState('')
  const [sendingQuote, setSendingQuote] = useState(false)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const lastTsRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const conversationId = bootstrap?.conversationId ?? null
  const pollMs = open ? 4000 : 15000
  const canPoll = Boolean(conversationId) && open

  useEffect(() => {
    if (!canPoll || !conversationId) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const run = async () => {
      if (cancelled) return
      try {
        const params = new URLSearchParams({ conversationId })
        if (lastTsRef.current) params.set('since', lastTsRef.current)
        const res = await fetch(appPath(`/api/chat/messages?${params.toString()}`), {
          credentials: 'include',
          cache: 'no-store',
          headers: catalogAuthHeaders(user),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && Array.isArray(data.items)) {
          const next = data.items as MessageItem[]
          if (next.length) {
            lastTsRef.current = next[next.length - 1]?.created_at ?? lastTsRef.current
            setMessages((prev) => [...prev, ...next])
          }
        }
      } catch {
        // ignore polling failures; next tick retries
      } finally {
        if (!cancelled) timer = setTimeout(run, pollMs)
      }
    }

    timer = setTimeout(run, 100)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [canPoll, conversationId, pollMs, user])

  useEffect(() => {
    if (!open) return
    lastTsRef.current = null
    setMessages([])
  }, [open, conversationId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

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
              }`}
            >
              {m.message_type === 'quote' && m.quote ? (
                <ChatQuoteCard quote={m.quote} compact />
              ) : (
                <div className="whitespace-pre-wrap">{m.body}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }, [messages])

  useEffect(() => {
    if (!open) return
    if (!bootstrap?.conversationId) return
    if (!pendingQuote?.productId) return
    if (sendingQuote) return

    let cancelled = false
    const run = async () => {
      setQuoteError('')
      setSendingQuote(true)
      try {
        const res = await fetch(appPath('/api/chat/quotes'), {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            ...catalogAuthHeaders(user),
          },
          body: JSON.stringify({
            conversationId: bootstrap.conversationId,
            productId: pendingQuote.productId,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(String(data?.error || `HTTP_${res.status}`))
        if (!cancelled) clearPendingQuote()
        lastTsRef.current = null
        setMessages([])
      } catch (e) {
        if (!cancelled) setQuoteError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setSendingQuote(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [open, bootstrap?.conversationId, pendingQuote?.productId, sendingQuote, clearPendingQuote, user])

  const sendMessage = async () => {
    if (!conversationId || !reply.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(appPath('/api/chat/messages'), {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...catalogAuthHeaders(user),
        },
        body: JSON.stringify({ conversationId, text: reply.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(String(data?.error || `HTTP_${res.status}`))
      setReply('')
      lastTsRef.current = null
      const pollRes = await fetch(
        appPath(`/api/chat/messages?${new URLSearchParams({ conversationId }).toString()}`),
        {
          credentials: 'include',
          cache: 'no-store',
          headers: catalogAuthHeaders(user),
        }
      )
      const pollData = await pollRes.json().catch(() => ({}))
      if (pollRes.ok && Array.isArray(pollData.items)) {
        const items = pollData.items as MessageItem[]
        setMessages(items)
        if (items.length) lastTsRef.current = items[items.length - 1]?.created_at ?? null
      }
    } catch {
      // keep reply text on failure
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  const isSupplier = bootstrap?.chatRole === 'pricelist_supplier'

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
          {loading ? (
            <div className="text-gray-500">{t('chat.loading')}</div>
          ) : quoteError ? (
            <div className="text-red-600">{quoteError}</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : bootstrap?.conversationId ? (
            <div className="text-gray-600">
              {sendingQuote ? (
                <div className="text-gray-500 mb-2">{t('chat.sendingQuote')}</div>
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
