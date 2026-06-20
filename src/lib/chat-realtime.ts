/** Active chat polling interval (ms) while a conversation is open. */
export const CHAT_POLL_MS = 5000

/** Supplier thread list refresh while chat widget is open (silent). */
export const CHAT_INBOX_POLL_MS = 20000

export type ChatMessageListItem = {
  id: string
  sender_role: string
  message_type: string
  body: string | null
  created_at: string
  quote: unknown | null
}

export function mergeChatMessages<T extends { id: string }>(
  prev: T[],
  incoming: T[],
  reset: boolean
): T[] {
  if (reset) return incoming
  if (!incoming.length) return prev
  const seen = new Set(prev.map((m) => m.id))
  const added = incoming.filter((m) => !seen.has(m.id))
  return added.length ? [...prev, ...added] : prev
}

export function latestMessageTimestamp(items: { created_at: string }[]): string | null {
  if (!items.length) return null
  return items[items.length - 1]?.created_at ?? null
}

export function rowToMessageItem(row: {
  id: string
  sender_role: string
  message_type: string
  body?: string | null
  created_at: string
  quote?: unknown | null
}): ChatMessageListItem {
  return {
    id: row.id,
    sender_role: row.sender_role,
    message_type: row.message_type,
    body: row.body ?? null,
    created_at: row.created_at,
    quote: row.quote ?? null,
  }
}

export function createOptimisticMessage(input: {
  senderRole: string
  body: string
  messageType?: string
}): ChatMessageListItem {
  return {
    id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sender_role: input.senderRole,
    message_type: input.messageType ?? 'text',
    body: input.body,
    created_at: new Date().toISOString(),
    quote: null,
  }
}

export function replaceOptimisticMessage(
  prev: ChatMessageListItem[],
  optimisticId: string,
  confirmed: ChatMessageListItem
): ChatMessageListItem[] {
  const withoutPending = prev.filter((m) => m.id !== optimisticId)
  return mergeChatMessages(withoutPending, [confirmed], false)
}
