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
}

export function useChatMessagePoll<T extends ChatMessageListItem>({
  enabled,
  fetchMessages,
  pollMs = CHAT_POLL_MS,
}: UseChatMessagePollOptions<T>) {
  const [messages, setMessages] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const lastTsRef = useRef<string | null>(null)

  const loadMessages = useCallback(
    async (reset = false) => {
      if (!enabled) return
      if (reset) setLoading(true)
      try {
        const since = reset ? null : lastTsRef.current
        const items = await fetchMessages(since)
        setMessages((prev) => mergeChatMessages(prev, items, reset) as T[])
        const ts = latestMessageTimestamp(items)
        if (ts) lastTsRef.current = ts
        else if (reset) lastTsRef.current = null
      } catch {
        // retry on next poll
      } finally {
        if (reset) setLoading(false)
      }
    },
    [enabled, fetchMessages]
  )

  const resetMessages = useCallback(() => {
    lastTsRef.current = null
    setMessages([])
  }, [])

  const bumpFromMessage = useCallback((message: T) => {
    setMessages((prev) => mergeChatMessages(prev, [message], false) as T[])
    if (message.created_at) lastTsRef.current = message.created_at
  }, [])

  useEffect(() => {
    if (!enabled) {
      resetMessages()
      return
    }
    void loadMessages(true)
    const timer = setInterval(() => void loadMessages(false), pollMs)
    return () => clearInterval(timer)
  }, [enabled, loadMessages, pollMs, resetMessages])

  return {
    messages,
    setMessages,
    loading,
    loadMessages,
    bumpFromMessage,
    resetMessages,
    lastTsRef,
  }
}
