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
import { appPath } from '@/lib/paths'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'

export type ChatQuoteAttach = {
  productId: string
}

export type ChatBootstrap = {
  sessionId: string
  participantType: string
  conversationId: string | null
  conversationType: string | null
  mode: string
  pricelistOwnerId: string | null
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
  const [open, setOpen] = useState(false)
  const [bootstrap, setBootstrap] = useState<ChatBootstrap | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingQuote, setPendingQuote] = useState<ChatQuoteAttach | null>(null)
  const startedRef = useRef(false)

  const loadBootstrap = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = (await fetchJson(appPath('/api/chat/bootstrap'), {
        headers: catalogAuthHeaders(user),
      })) as ChatBootstrap
      setBootstrap(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBootstrap(null)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!open) return
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
    }),
    [open, bootstrap, loading, error, requestQuote, pendingQuote, clearPendingQuote]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

