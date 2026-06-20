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
  loading: boolean
  error: string
  requestQuote: (quote: ChatQuoteAttach) => void
  pendingQuote: ChatQuoteAttach | null
  clearPendingQuote: () => void
  pricelistOwnerParam: string | null
  selectedSupplierThreadId: string | null
  setSelectedSupplierThreadId: (id: string | null) => void
  refreshBootstrap: () => Promise<void>
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

export default function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [bootstrap, setBootstrap] = useState<ChatBootstrap | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingQuote, setPendingQuote] = useState<ChatQuoteAttach | null>(null)
  const [selectedSupplierThreadId, setSelectedSupplierThreadId] = useState<string | null>(null)
  const startedRef = useRef(false)

  const pricelistOwnerParam = useMemo(() => {
    if (!pathname?.includes('/pricelist')) return null
    return searchParams.get('owner')?.trim() || null
  }, [pathname, searchParams])

  const loadBootstrap = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (pricelistOwnerParam) params.set('owner', pricelistOwnerParam)
      const suffix = params.toString() ? `?${params.toString()}` : ''
      const data = (await fetchJson(appPath(`/api/chat/bootstrap${suffix}`), {
        headers: catalogAuthHeaders(user),
      })) as ChatBootstrap
      setBootstrap(data)
      if (data.chatRole === 'pricelist_supplier') {
        setSelectedSupplierThreadId(
          (prev) => prev ?? data.selectedThreadId ?? data.supplierThreads[0]?.id ?? null
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBootstrap(null)
    } finally {
      setLoading(false)
    }
  }, [user, pricelistOwnerParam])

  useEffect(() => {
    if (!open) return
    startedRef.current = false
    void loadBootstrap()
  }, [pricelistOwnerParam, open, loadBootstrap])

  useEffect(() => {
    if (!open) {
      startedRef.current = false
      return
    }
    if (startedRef.current) return
    startedRef.current = true
    void loadBootstrap()
  }, [open, loadBootstrap])

  const requestQuote = useCallback((quote: ChatQuoteAttach) => {
    setPendingQuote(quote)
    setOpen(true)
  }, [])

  const clearPendingQuote = useCallback(() => setPendingQuote(null), [])

  const value = useMemo(
    () => ({
      open,
      setOpen,
      bootstrap,
      loading,
      error,
      requestQuote,
      pendingQuote,
      clearPendingQuote,
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
      pendingQuote,
      clearPendingQuote,
      pricelistOwnerParam,
      selectedSupplierThreadId,
      loadBootstrap,
    ]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
