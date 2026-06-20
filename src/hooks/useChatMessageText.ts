'use client'

import { useCallback } from 'react'
import { useI18n } from '@/lib/i18n-context'
import {
  formatChatMessageBody,
  formatChatProductLabel,
  formatChatQuoteStatus,
} from '@/lib/chat-message-i18n'

export function useChatMessageText() {
  const { t } = useI18n()

  const localizeMessageBody = useCallback(
    (body: string | null | undefined) => formatChatMessageBody(body, (key) => t(key)),
    [t]
  )

  const quoteStatusLabel = useCallback(
    (status: string) => formatChatQuoteStatus(status, (key) => t(key)),
    [t]
  )

  const productLabel = useCallback(
    (input: { name: string; sku?: string | null }) =>
      formatChatProductLabel(input, (key) => t(key)),
    [t]
  )

  return { localizeMessageBody, quoteStatusLabel, productLabel, t }
}
