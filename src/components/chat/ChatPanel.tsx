'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '@/components/chat/ChatProvider'
import { useI18n } from '@/lib/i18n-context'
import { appPath } from '@/lib/paths'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'

export default function ChatPanel() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { open, loading, error, bootstrap, pendingQuote, clearPendingQuote } = useChat()
  const [quoteError, setQuoteError] = useState('')
  const [sendingQuote, setSendingQuote] = useState(false)
  const [messages, setMessages] = useState<{ id: string; body: string | null; created_at: string }[]>([])
  const lastTsRef = useRef<string | null>(null)

  const conversationId = bootstrap?.conversationId ?? null
  const pollMs = open ? 4000 : 15000
  const canPoll = Boolean(conversationId) && open

  useEffect(() => {
    // Future: message polling starts here when open.
  }, [open])

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
          const next = data.items as { id: string; body: string | null; created_at: string }[]
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

  const messageList = useMemo(() => {
    if (!messages.length) return null
    return (
      <div className="space-y-2">
        {messages.map((m) => (
          <div key={m.id} className="text-sm text-gray-800">
            {m.body || <span className="text-gray-500">[quote request]</span>}
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

  if (!open) return null

  return (
    <div className="fixed bottom-24 right-5 z-[9998] w-[min(92vw,380px)]">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="font-semibold text-gray-900">{t('chat.title')}</div>
          <div className="text-xs text-gray-500">{t('chat.subtitle')}</div>
        </div>

        <div className="p-4 text-sm text-gray-700 min-h-[220px]">
          {loading ? (
            <div className="text-gray-500">{t('chat.loading')}</div>
          ) : quoteError ? (
            <div className="text-red-600">{quoteError}</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : bootstrap?.conversationId ? (
            <div className="text-gray-600">
              {messageList ?? <div className="text-gray-500">{t('chat.ready')}</div>}
            </div>
          ) : (
            <div className="text-gray-600">{t('chat.notAvailable')}</div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 bg-white">
          <div className="text-xs text-gray-500">{t('chat.v1Hint')}</div>
        </div>
      </div>
    </div>
  )
}

