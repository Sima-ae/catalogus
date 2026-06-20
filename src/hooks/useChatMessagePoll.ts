'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CHAT_POLL_MS,
  latestMessageTimestamp,
  mergeChatMessages,
  type ChatMessageListItem,
} from '@/lib/chat-realtime'

type UseChatMessagePollOptions<T extends ChatMessageListItem> = {
  enabled: boolean
  fetchMessages: (since: string | null) => Promise<T[]>
  pollMs?: number
  /** Changing this re-loads the thread from scratch (new conversation). */
  conversationKey?: string | null
}

export function useChatMessagePoll<T extends ChatMessageListItem>({
  enabled,
  fetchMessages,
  pollMs = CHAT_POLL_MS,
  conversationKey = null,
}: UseChatMessagePollOptions<T>) {
  const [messages, setMessages] = useState<T[]>([])
  const [initialLoading, setInitialLoading] = useState(false)
  const lastTsRef = useRef<string | null>(null)
  const fetchRef = useRef(fetchMessages)
  const hasLoadedRef = useRef(false)
  fetchRef.current = fetchMessages

  const loadMessages = useCallback(async (reset = false) => {
    if (!enabled) return
    const showSpinner = reset && !hasLoadedRef.current
    if (showSpinner) setInitialLoading(true)
    try {
      const since = reset ? null : lastTsRef.current
      const items = await fetchRef.current(since)
      setMessages((prev) => mergeChatMessages(prev, items, reset) as T[])
      const ts = latestMessageTimestamp(items)
      if (ts) lastTsRef.current = ts
      else if (reset) lastTsRef.current = null
      if (reset) hasLoadedRef.current = true
    } catch {
      // retry on next poll
    } finally {
      if (showSpinner) setInitialLoading(false)
    }
  }, [enabled])

  const resetMessages = useCallback(() => {
    lastTsRef.current = null
    hasLoadedRef.current = false
    setMessages([])
  }, [])

  const bumpFromMessage = useCallback((message: T) => {
    setMessages((prev) => mergeChatMessages(prev, [message], false) as T[])
    if (message.created_at) lastTsRef.current = message.created_at
    hasLoadedRef.current = true
  }, [])

  useEffect(() => {
    if (!enabled) {
      resetMessages()
      return
    }
    hasLoadedRef.current = false
    void loadMessages(true)

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      void loadMessages(false)
    }
    const timer = setInterval(tick, pollMs)
    return () => clearInterval(timer)
  }, [enabled, conversationKey, pollMs, loadMessages, resetMessages])

  return {
    messages,
    setMessages,
    loading: initialLoading,
    loadMessages,
    bumpFromMessage,
    resetMessages,
    lastTsRef,
  }
}
