'use client'

import { useCallback, useEffect, useRef, type RefObject } from 'react'

const NEAR_BOTTOM_PX = 72

export function isChatNearBottom(element: HTMLElement, threshold = NEAR_BOTTOM_PX): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= threshold
}

function scrollToBottom(element: HTMLElement) {
  element.scrollTop = element.scrollHeight
}

type Options = {
  /** When this changes (new thread/conversation), scroll to the latest messages once. */
  conversationKey?: string | null
}

/**
 * Keeps chat scroll stable while polling. Only follows new messages when the user
 * is already near the bottom, or when requestScrollToBottom() is called (e.g. after send).
 */
export function useChatAutoScroll(
  containerRef: RefObject<HTMLElement | null>,
  messageCount: number,
  options?: Options
) {
  const stickToBottomRef = useRef(true)
  const pendingScrollRef = useRef(false)
  const prevCountRef = useRef(0)
  const conversationKey = options?.conversationKey ?? null

  const requestScrollToBottom = useCallback(() => {
    pendingScrollRef.current = true
    stickToBottomRef.current = true
    const el = containerRef.current
    if (el) scrollToBottom(el)
  }, [containerRef])

  useEffect(() => {
    stickToBottomRef.current = true
    pendingScrollRef.current = true
    prevCountRef.current = 0
  }, [conversationKey])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onScroll = () => {
      stickToBottomRef.current = isChatNearBottom(el)
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [containerRef, conversationKey])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const prevCount = prevCountRef.current
    prevCountRef.current = messageCount

    const shouldScroll =
      pendingScrollRef.current ||
      stickToBottomRef.current ||
      (prevCount === 0 && messageCount > 0)

    pendingScrollRef.current = false

    if (!shouldScroll) return

    requestAnimationFrame(() => {
      scrollToBottom(el)
    })
  }, [containerRef, messageCount, conversationKey])

  return { requestScrollToBottom }
}
