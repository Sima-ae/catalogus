'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { appPath } from '@/lib/paths'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'
import { CHAT_INBOX_POLL_MS } from '@/lib/chat-realtime'

export type ChatQuoteAttach = {
  productId: string
}

export type SupplierThreadSummary = {
  id: string
  productName: string | null
  productSku: string | null
  productImageUrl: string | null
  quoteId: string | null
  productId?: string | null
}

export type ChatBootstrap = {
  sessionId: string
  participantType: string
  chatRole: 'buyer' | 'pricelist_supplier'
  displayLabel: string | null
  conversationId: string | null
  conversationType: string | null
  mode: string
  pricelistOwnerId: string | null
  supplierThreads: SupplierThreadSummary[]
  selectedThreadId: string | null
}

type ChatContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  bootstrap: ChatBootstrap | null
  /** True only on first connect — background refreshes stay silent. */
  loading: boolean
  error: string
  requestQuote: (quote: ChatQuoteAttach) => void
  quoteQueue: string[]
  dequeueQuote: (productId: string) => void
  pricelistOwnerParam: string | null
  selectedSupplierThreadId: string | null
  setSelectedSupplierThreadId: (id: string | null) => void
  refreshBootstrap: (options?: { silent?: boolean }) => Promise<void>
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used inside ChatProvider')
  return ctx
}

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, { ...init, cache: 'no-store', credentials: 'include' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(String(data?.error || `HTTP_${res.status}`))
  }
  return data
}

function bootstrapSnapshotEqual(a: ChatBootstrap | null, b: ChatBootstrap): boolean {
  if (!a) return false
  if (
    a.sessionId !== b.sessionId ||
    a.conversationId !== b.conversationId ||
    a.chatRole !== b.chatRole ||
    a.displayLabel !== b.displayLabel ||
    a.participantType !== b.participantType
  ) {
    return false
  }
  if (a.supplierThreads.length !== b.supplierThreads.length) return false
  for (let i = 0; i < a.supplierThreads.length; i++) {
    const left = a.supplierThreads[i]
    const right = b.supplierThreads[i]
    if (!left || !right || left.id !== right.id || left.quoteId !== right.quoteId) return false
  }
  return true
}

export default function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [bootstrap, setBootstrap] = useState<ChatBootstrap | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [quoteQueue, setQuoteQueue] = useState<string[]>([])
  const [selectedSupplierThreadId, setSelectedSupplierThreadId] = useState<string | null>(null)
  const bootstrapRef = useRef<ChatBootstrap | null>(null)
  bootstrapRef.current = bootstrap

  const pricelistOwnerParam = useMemo(() => {
    if (!pathname?.includes('/pricelist')) return null
    return searchParams.get('owner')?.trim() || null
  }, [pathname, searchParams])

  const loadBootstrap = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false
      if (!silent) {
        setLoading(true)
        setError('')
      }
      try {
        const params = new URLSearchParams()
        if (pricelistOwnerParam) params.set('owner', pricelistOwnerParam)
        const suffix = params.toString() ? `?${params.toString()}` : ''
        const data = (await fetchJson(appPath(`/api/chat/bootstrap${suffix}`), {
          headers: catalogAuthHeaders(user),
        })) as ChatBootstrap
        if (!silent || !bootstrapSnapshotEqual(bootstrapRef.current, data)) {
          setBootstrap(data)
          if (data.chatRole === 'pricelist_supplier') {
            setSelectedSupplierThreadId(
              (prev) => prev ?? data.selectedThreadId ?? data.supplierThreads[0]?.id ?? null
            )
          }
        }
        setError('')
      } catch (e) {
        if (!silent) {
          setError(e instanceof Error ? e.message : String(e))
          setBootstrap(null)
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [user, pricelistOwnerParam]
  )

  useEffect(() => {
    void loadBootstrap({ silent: true })
  }, [loadBootstrap])

  useEffect(() => {
    if (!open) return
    void loadBootstrap({ silent: Boolean(bootstrapRef.current) })
  }, [open, pricelistOwnerParam, loadBootstrap])

  useEffect(() => {
    if (!open) return
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      void loadBootstrap({ silent: true })
    }
    const timer = setInterval(tick, CHAT_INBOX_POLL_MS)
    return () => clearInterval(timer)
  }, [open, loadBootstrap])

  const requestQuote = useCallback((quote: ChatQuoteAttach) => {
    const productId = quote.productId.trim()
    if (!productId) return
    setQuoteQueue((prev) => (prev.includes(productId) ? prev : [...prev, productId]))
    setOpen(true)
  }, [])

  const dequeueQuote = useCallback((productId: string) => {
    setQuoteQueue((prev) => prev.filter((id) => id !== productId))
  }, [])

  const value = useMemo(
    () => ({
      open,
      setOpen,
      bootstrap,
      loading,
      error,
      requestQuote,
      quoteQueue,
      dequeueQuote,
      pricelistOwnerParam,
      selectedSupplierThreadId,
      setSelectedSupplierThreadId,
      refreshBootstrap: loadBootstrap,
    }),
    [
      open,
      bootstrap,
      loading,
      error,
      requestQuote,
      quoteQueue,
      dequeueQuote,
      pricelistOwnerParam,
      selectedSupplierThreadId,
      loadBootstrap,
    ]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
