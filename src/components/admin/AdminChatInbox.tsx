'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-local'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { appPath } from '@/lib/paths'
import ChatQuoteCard, { type ChatQuoteCardData } from '@/components/chat/ChatQuoteCard'

type ThreadItem = {
  id: string
  status: string
  buyerLabel: string
  accessCode: string | null
  lastMessagePreview: string | null
  pendingQuoteCount: number
  updated_at: string
}

type QuoteItem = ChatQuoteCardData & {
  buyerLabel: string
  accessCode: string | null
  conversation_id: string
  message_id: string
}

type SellerOption = {
  id: string
  name: string | null
  email: string
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

export default function AdminChatInbox() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'threads' | 'quotes'>('threads')
  const [threads, setThreads] = useState<ThreadItem[]>([])
  const [quotes, setQuotes] = useState<QuoteItem[]>([])
  const [sellers, setSellers] = useState<SellerOption[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [loadingInbox, setLoadingInbox] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState('')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [escalatingId, setEscalatingId] = useState<string | null>(null)
  const [pickSellerForQuote, setPickSellerForQuote] = useState<QuoteItem | null>(null)
  const [pickSellerId, setPickSellerId] = useState('')
  const [supplierConvId, setSupplierConvId] = useState<string | null>(null)
  const [supplierMessages, setSupplierMessages] = useState<MessageItem[]>([])
  const [supplierReply, setSupplierReply] = useState('')
  const [supplierSending, setSupplierSending] = useState(false)
  const supplierLastTsRef = useRef<string | null>(null)
  const lastTsRef = useRef<string | null>(null)

  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...adminAuthHeaders(user),
    }),
    [user]
  )

  const loadInbox = useCallback(async () => {
    try {
      const data = await fetchJson(appPath('/api/admin/chat/inbox'), { headers: adminAuthHeaders(user) })
      setThreads(data.threads ?? [])
      setQuotes(data.quotes ?? [])
      setSellers(data.sellers ?? [])
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
        const suffix = params.toString() ? `?${params.toString()}` : ''
        const data = await fetchJson(
          appPath(`/api/admin/chat/conversations/${conversationId}/messages${suffix}`),
          { headers: adminAuthHeaders(user) }
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
    [user]
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

  const openThread = (id: string) => {
    setTab('threads')
    setSelectedId(id)
  }

  const sendReply = async () => {
    if (!selectedId || !reply.trim() || sending) return
    setSending(true)
    try {
      await fetchJson(appPath(`/api/admin/chat/conversations/${selectedId}/messages`), {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: reply.trim() }),
      })
      setReply('')
      await loadMessages(selectedId, true)
      void loadInbox()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  const escalateQuote = async (quote: QuoteItem, sellerUserId?: string) => {
    if (escalatingId) return
    setEscalatingId(quote.id)
    setError('')
    try {
      await fetchJson(appPath(`/api/admin/chat/quotes/${quote.id}/escalate`), {
        method: 'POST',
        headers,
        body: JSON.stringify(sellerUserId ? { sellerUserId } : {}),
      })
      setPickSellerForQuote(null)
      setPickSellerId('')
      if (quote.conversation_id) openThread(quote.conversation_id)
      await loadMessages(quote.conversation_id, true)
      void loadInbox()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('sellerUserId is required') && sellers.length > 1) {
        setPickSellerForQuote(quote)
        setPickSellerId(sellers[0]?.id ?? '')
      } else {
        setError(msg)
      }
    } finally {
      setEscalatingId(null)
    }
  }

  const markAnswered = async (quoteId: string) => {
    try {
      await fetchJson(appPath(`/api/admin/chat/quotes/${quoteId}`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'answered' }),
      })
      if (selectedId) await loadMessages(selectedId, true)
      void loadInbox()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const loadSupplierMessages = useCallback(
    async (conversationId: string, reset = false) => {
      try {
        const params = new URLSearchParams()
        if (!reset && supplierLastTsRef.current) params.set('since', supplierLastTsRef.current)
        const suffix = params.toString() ? `?${params.toString()}` : ''
        const data = await fetchJson(
          appPath(`/api/admin/chat/supplier-conversations/${conversationId}/messages${suffix}`),
          { headers: adminAuthHeaders(user) }
        )
        const items = (data.items ?? []) as MessageItem[]
        if (reset) {
          setSupplierMessages(items)
        } else if (items.length) {
          setSupplierMessages((prev) => [...prev, ...items])
        }
        if (items.length) {
          supplierLastTsRef.current = items[items.length - 1]?.created_at ?? supplierLastTsRef.current
        } else if (reset) {
          supplierLastTsRef.current = null
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    [user]
  )

  const openSupplierThread = (conversationId: string) => {
    setSupplierConvId(conversationId)
    supplierLastTsRef.current = null
    setSupplierMessages([])
    void loadSupplierMessages(conversationId, true)
  }

  useEffect(() => {
    if (!supplierConvId) return
    const timer = setInterval(() => void loadSupplierMessages(supplierConvId, false), 4000)
    return () => clearInterval(timer)
  }, [supplierConvId, loadSupplierMessages])

  const sendSupplierReply = async () => {
    if (!supplierConvId || !supplierReply.trim() || supplierSending) return
    setSupplierSending(true)
    try {
      await fetchJson(appPath(`/api/admin/chat/supplier-conversations/${supplierConvId}/messages`), {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: supplierReply.trim() }),
      })
      setSupplierReply('')
      await loadSupplierMessages(supplierConvId, true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSupplierSending(false)
    }
  }

  const renderQuoteActions = (quote: ChatQuoteCardData) => (
    <>
      {!quote.supplier_conversation_id && quote.status === 'pending' ? (
        <button
          type="button"
          onClick={() => {
            const full = quotes.find((q) => q.id === quote.id)
            if (full) void escalateQuote(full)
          }}
          disabled={escalatingId === quote.id}
          className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {escalatingId === quote.id ? 'Asking…' : 'Ask supplier'}
        </button>
      ) : null}
      {quote.supplier_conversation_id ? (
        <button
          type="button"
          onClick={() => openSupplierThread(quote.supplier_conversation_id!)}
          className="rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100"
        >
          Supplier thread
        </button>
      ) : null}
      {quote.status !== 'answered' && quote.status !== 'closed' ? (
        <button
          type="button"
          onClick={() => void markAnswered(quote.id)}
          className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Mark answered
        </button>
      ) : null}
    </>
  )

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {error ? (
        <div className="px-4 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] min-h-[560px]">
        <aside className="border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col">
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setTab('threads')}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                tab === 'threads' ? 'text-blue-700 border-b-2 border-blue-600' : 'text-gray-600'
              }`}
            >
              Threads ({threads.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('quotes')}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                tab === 'quotes' ? 'text-blue-700 border-b-2 border-blue-600' : 'text-gray-600'
              }`}
            >
              Quotes ({quotes.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[520px]">
            {loadingInbox ? (
              <div className="p-4 text-sm text-gray-500">Loading…</div>
            ) : tab === 'threads' ? (
              threads.length ? (
                <ul>
                  {threads.map((thread) => (
                    <li key={thread.id}>
                      <button
                        type="button"
                        onClick={() => openThread(thread.id)}
                        className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${
                          selectedId === thread.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900 truncate">{thread.buyerLabel}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {thread.lastMessagePreview || 'No messages yet'}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
                          <span>{formatTime(thread.updated_at)}</span>
                          {thread.pendingQuoteCount > 0 ? (
                            <span className="rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.5">
                              {thread.pendingQuoteCount} quote{thread.pendingQuoteCount > 1 ? 's' : ''}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-sm text-gray-500">No buyer threads yet.</div>
              )
            ) : quotes.length ? (
              <ul>
                {quotes.map((quote) => (
                  <li key={quote.id}>
                    <button
                      type="button"
                      onClick={() => openThread(quote.conversation_id)}
                      className="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50"
                    >
                      <div className="font-medium text-gray-900 truncate">{quote.product_name}</div>
                      <div className="text-xs text-gray-500 truncate">{quote.buyerLabel}</div>
                      <div className="mt-1 text-[11px] text-gray-400">{quote.status}</div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-sm text-gray-500">No pending quotes.</div>
            )}
          </div>
        </aside>

        <section className="flex flex-col min-h-[400px]">
          {selectedId ? (
            <>
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="font-semibold text-gray-900">
                  {selectedThread?.buyerLabel ?? 'Conversation'}
                </div>
                {selectedThread?.accessCode ? (
                  <div className="text-xs text-gray-500">Access code: {selectedThread.accessCode}</div>
                ) : null}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[420px]">
                {loadingMessages && !messages.length ? (
                  <div className="text-sm text-gray-500">Loading messages…</div>
                ) : messages.length ? (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                          m.sender_role === 'admin'
                            ? 'bg-blue-600 text-white'
                            : m.sender_role === 'system'
                              ? 'bg-gray-100 text-gray-600 text-xs italic'
                              : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {m.message_type === 'quote' && m.quote ? (
                          <ChatQuoteCard quote={m.quote} compact actions={renderQuoteActions(m.quote)} />
                        ) : (
                          <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                        )}
                        <div
                          className={`mt-1 text-[10px] ${
                            m.sender_role === 'admin' ? 'text-blue-100' : 'text-gray-400'
                          }`}
                        >
                          {formatTime(m.created_at)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">No messages in this thread yet.</div>
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
                  placeholder="Reply to buyer…"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => void sendReply()}
                  disabled={sending || !reply.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-500 p-8">
              Select a thread to view messages and reply.
            </div>
          )}
        </section>
      </div>

      {pickSellerForQuote ? (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="font-semibold text-gray-900">Choose supplier</h3>
            <p className="mt-1 text-sm text-gray-600">
              This product has no assigned seller. Pick who should receive the supplier thread.
            </p>
            <select
              value={pickSellerId}
              onChange={(e) => setPickSellerId(e.target.value)}
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name?.trim() || s.email}
                </option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPickSellerForQuote(null)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!pickSellerId || escalatingId === pickSellerForQuote.id}
                onClick={() => void escalateQuote(pickSellerForQuote, pickSellerId)}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Ask supplier
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {supplierConvId ? (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl flex flex-col max-h-[80vh]">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Supplier thread</h3>
                <p className="text-xs text-gray-500">Chat with seller — buyer is not visible here.</p>
              </div>
              <button
                type="button"
                onClick={() => setSupplierConvId(null)}
                className="text-gray-500 hover:text-gray-800 text-sm"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {supplierMessages.length ? (
                supplierMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                        m.sender_role === 'admin'
                          ? 'bg-blue-600 text-white'
                          : m.sender_role === 'seller'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-gray-100 text-gray-600 italic'
                      }`}
                    >
                      {m.body}
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
                value={supplierReply}
                onChange={(e) => setSupplierReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void sendSupplierReply()
                  }
                }}
                placeholder="Message supplier…"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void sendSupplierReply()}
                disabled={supplierSending || !supplierReply.trim()}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
