'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'
import { appPath } from '@/lib/paths'
import ChatQuoteCard, { type ChatQuoteCardData } from '@/components/chat/ChatQuoteCard'

type ThreadItem = {
  id: string
  status: string
  updated_at: string
  quoteId: string | null
  productName: string | null
  productSku: string | null
  productImageUrl: string | null
  quoteStatus: string | null
  pricelistLabel?: string
  pricelistOwnerId?: string
}

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

export default function SellerChatInbox() {
  const { user } = useAuth()
  const [threads, setThreads] = useState<ThreadItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [loadingInbox, setLoadingInbox] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState('')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const lastTsRef = useRef<string | null>(null)

  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...catalogAuthHeaders(user),
    }),
    [user]
  )

  const loadInbox = useCallback(async () => {
    try {
      const data = await fetchJson(appPath('/api/chat/supplier/inbox'), {
        headers: catalogAuthHeaders(user),
      })
      setThreads(data.threads ?? [])
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingInbox(false)
    }
  }, [user])

  useEffect(() => {
    void loadInbox()
    const timer = setInterval(() => void loadInbox(), 12000)
    return () => clearInterval(timer)
  }, [loadInbox])

  const selectedThread = useMemo(
    () => threads.find((t) => t.id === selectedId) ?? null,
    [threads, selectedId]
  )

  const loadMessages = useCallback(
    async (conversationId: string, reset = false) => {
      setLoadingMessages(true)
      try {
        const params = new URLSearchParams()
        if (!reset && lastTsRef.current) params.set('since', lastTsRef.current)
        const ownerForThread = threads.find((t) => t.id === conversationId)?.pricelistOwnerId
        if (ownerForThread) params.set('owner', ownerForThread)
        const query = params.toString() ? `?${params.toString()}` : ''
        const data = await fetchJson(
          appPath(`/api/chat/supplier/conversations/${conversationId}/messages${query}`),
          { headers: catalogAuthHeaders(user) }
        )
        const items = (data.items ?? []) as MessageItem[]
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
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoadingMessages(false)
      }
    },
    [user, threads]
  )

  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      lastTsRef.current = null
      return
    }
    void loadMessages(selectedId, true)
    const timer = setInterval(() => void loadMessages(selectedId, false), 4000)
    return () => clearInterval(timer)
  }, [selectedId, loadMessages])

  const sendReply = async () => {
    if (!selectedId || !reply.trim() || sending) return
    setSending(true)
    try {
      await fetchJson(
        appPath(
          `/api/chat/supplier/conversations/${selectedId}/messages${
            (() => {
              const owner = threads.find((t) => t.id === selectedId)?.pricelistOwnerId
              return owner ? `?owner=${encodeURIComponent(owner)}` : ''
            })()
          }`
        ),
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ text: reply.trim() }),
        }
      )
      setReply('')
      await loadMessages(selectedId, true)
      void loadInbox()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  const contextQuote: ChatQuoteCardData | null = selectedThread?.productName
    ? {
        id: selectedThread.quoteId ?? selectedThread.id,
        product_name: selectedThread.productName,
        product_sku: selectedThread.productSku,
        product_image_url: selectedThread.productImageUrl,
        product_brand: null,
        product_category: null,
        status: selectedThread.quoteStatus ?? 'with_supplier',
      }
    : null

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-600">
          Reply to admin about quote requests. You never see buyer chats — only product context shared by admin.
        </p>
      </div>

      {error ? (
        <div className="px-4 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] min-h-[520px]">
        <aside className="border-b lg:border-b-0 lg:border-r border-gray-200">
          <div className="px-4 py-3 text-sm font-medium text-gray-900 border-b border-gray-100">
            Supplier threads ({threads.length})
          </div>
          <div className="overflow-y-auto max-h-[460px]">
            {loadingInbox ? (
              <div className="p-4 text-sm text-gray-500">Loading…</div>
            ) : threads.length ? (
              <ul>
                {threads.map((thread) => (
                  <li key={thread.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(thread.id)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${
                        selectedId === thread.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900 truncate">
                        {thread.productName ?? 'Quote request'}
                      </div>
                      {thread.pricelistLabel ? (
                        <div className="text-[11px] text-emerald-700 truncate">{thread.pricelistLabel}</div>
                      ) : null}
                      {thread.productSku ? (
                        <div className="text-xs text-gray-500 truncate">SKU {thread.productSku}</div>
                      ) : null}
                      <div className="mt-1 text-[11px] text-gray-400">{formatTime(thread.updated_at)}</div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-sm text-gray-500">No supplier threads yet.</div>
            )}
          </div>
        </aside>

        <section className="flex flex-col">
          {selectedId ? (
            <>
              {contextQuote ? (
                <div className="p-4 border-b border-gray-100">
                  <ChatQuoteCard quote={contextQuote} compact />
                </div>
              ) : null}

              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[380px]">
                {loadingMessages && !messages.length ? (
                  <div className="text-sm text-gray-500">Loading messages…</div>
                ) : messages.length ? (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.sender_role === 'seller' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                          m.sender_role === 'seller'
                            ? 'bg-emerald-600 text-white'
                            : m.sender_role === 'system'
                              ? 'bg-gray-100 text-gray-600 text-xs italic'
                              : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                        <div
                          className={`mt-1 text-[10px] ${
                            m.sender_role === 'seller' ? 'text-emerald-100' : 'text-gray-400'
                          }`}
                        >
                          {formatTime(m.created_at)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">No messages yet.</div>
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
                  placeholder="Reply to admin…"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => void sendReply()}
                  disabled={sending || !reply.trim()}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-500 p-8">
              Select a thread to reply to admin.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
