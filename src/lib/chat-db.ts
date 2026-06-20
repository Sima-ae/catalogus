import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'

export type ChatParticipantType =
  | 'site_password'
  | 'site_code'
  | 'buyer_user'
  | 'seller_user'
  | 'pricelist_guest'
  | 'admin_user'

export type ChatConversationType = 'buyer_thread' | 'supplier_thread'
export type ChatConversationStatus = 'open' | 'closed'

export type ChatSenderRole = 'visitor' | 'admin' | 'seller' | 'system'
export type ChatMessageType = 'text' | 'quote' | 'system'

export type ChatParticipantSessionRow = {
  id: string
  participant_type: ChatParticipantType
  site_access_code_id: string | null
  user_id: string | null
  pricelist_owner_id: string | null
  display_label: string | null
  created_at: string
  last_seen_at: string | null
}

export type ChatConversationRow = {
  id: string
  type: ChatConversationType
  status: ChatConversationStatus
  buyer_session_id: string | null
  supplier_session_id: string | null
  assigned_admin_user_id: string | null
  pricelist_owner_id: string | null
  created_at: string
  updated_at: string
}

export type ChatMessageRow = {
  id: string
  conversation_id: string
  sender_session_id: string
  sender_role: ChatSenderRole
  message_type: ChatMessageType
  body: string | null
  created_at: string
  read_at: string | null
}

export type ChatQuoteStatus = 'pending' | 'with_supplier' | 'answered' | 'closed'

export type ChatQuoteRequestRow = {
  id: string
  conversation_id: string
  message_id: string
  product_id: string | null
  product_name: string
  product_sku: string | null
  product_image_url: string | null
  product_brand: string | null
  product_category: string | null
  status: ChatQuoteStatus
  site_access_code_id: string | null
  user_id: string | null
  supplier_conversation_id: string | null
  created_at: string
  updated_at: string
}

export async function touchChatParticipantSessionLastSeen(sessionId: string): Promise<void> {
  await queryDb(
    `UPDATE chat_participant_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [sessionId]
  )
}

export async function getChatParticipantSessionById(
  id: string
): Promise<ChatParticipantSessionRow | null> {
  const rows = await queryDb<ChatParticipantSessionRow[]>(
    `SELECT * FROM chat_participant_sessions WHERE id = ? LIMIT 1`,
    [id]
  )
  return rows[0] ?? null
}

export async function createChatParticipantSession(input: {
  participantType: ChatParticipantType
  siteAccessCodeId?: string | null
  userId?: string | null
  pricelistOwnerId?: string | null
  displayLabel?: string | null
}): Promise<ChatParticipantSessionRow> {
  const id = randomUUID()
  await queryDb(
    `INSERT INTO chat_participant_sessions
      (id, participant_type, site_access_code_id, user_id, pricelist_owner_id, display_label)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.participantType,
      input.siteAccessCodeId ?? null,
      input.userId ?? null,
      input.pricelistOwnerId ?? null,
      input.displayLabel ?? null,
    ]
  )
  const row = await getChatParticipantSessionById(id)
  if (!row) throw new Error('CHAT_SESSION_CREATE_FAILED')
  return row
}

export async function findBuyerConversationForSession(
  buyerSessionId: string
): Promise<ChatConversationRow | null> {
  const rows = await queryDb<ChatConversationRow[]>(
    `SELECT * FROM chat_conversations
     WHERE type = 'buyer_thread' AND buyer_session_id = ? AND status = 'open'
     ORDER BY updated_at DESC
     LIMIT 1`,
    [buyerSessionId]
  )
  return rows[0] ?? null
}

export async function createBuyerConversation(input: {
  buyerSessionId: string
  assignedAdminUserId?: string | null
}): Promise<ChatConversationRow> {
  const id = randomUUID()
  await queryDb(
    `INSERT INTO chat_conversations
      (id, type, status, buyer_session_id, assigned_admin_user_id)
     VALUES (?, 'buyer_thread', 'open', ?, ?)`,
    [id, input.buyerSessionId, input.assignedAdminUserId ?? null]
  )
  return getChatConversationByIdOrThrow(id)
}

export async function getChatConversationByIdOrThrow(id: string): Promise<ChatConversationRow> {
  const rows = await queryDb<ChatConversationRow[]>(
    `SELECT * FROM chat_conversations WHERE id = ? LIMIT 1`,
    [id]
  )
  const row = rows[0]
  if (!row) throw new Error('CHAT_CONVERSATION_NOT_FOUND')
  return row
}

export async function listChatMessages(
  conversationId: string,
  options?: { since?: string | null; limit?: number }
): Promise<ChatMessageRow[]> {
  const limit = Math.min(500, Math.max(1, Math.floor(options?.limit ?? 200)))
  const since = options?.since?.trim() || null
  if (since) {
    return queryDb<ChatMessageRow[]>(
      `SELECT * FROM chat_messages
       WHERE conversation_id = ? AND created_at > ?
       ORDER BY created_at ASC
       LIMIT ?`,
      [conversationId, since, limit]
    )
  }
  return queryDb<ChatMessageRow[]>(
    `SELECT * FROM chat_messages
     WHERE conversation_id = ?
     ORDER BY created_at ASC
     LIMIT ?`,
    [conversationId, limit]
  )
}

export async function createChatMessage(input: {
  conversationId: string
  senderSessionId: string
  senderRole: ChatSenderRole
  messageType: ChatMessageType
  body?: string | null
}): Promise<ChatMessageRow> {
  const id = randomUUID()
  await queryDb(
    `INSERT INTO chat_messages
      (id, conversation_id, sender_session_id, sender_role, message_type, body)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.conversationId,
      input.senderSessionId,
      input.senderRole,
      input.messageType,
      input.body ?? null,
    ]
  )
  await queryDb(`UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
    input.conversationId,
  ])
  const rows = await queryDb<ChatMessageRow[]>(
    `SELECT * FROM chat_messages WHERE id = ? LIMIT 1`,
    [id]
  )
  const row = rows[0]
  if (!row) throw new Error('CHAT_MESSAGE_CREATE_FAILED')
  return row
}

export async function createChatQuoteRequest(input: {
  conversationId: string
  messageId: string
  productId: string | null
  productName: string
  productSku: string | null
  productImageUrl: string | null
  productBrand: string | null
  productCategory: string | null
  status?: ChatQuoteStatus
  siteAccessCodeId?: string | null
  userId?: string | null
}): Promise<ChatQuoteRequestRow> {
  const id = randomUUID()
  await queryDb(
    `INSERT INTO chat_quote_requests
      (id, conversation_id, message_id, product_id, product_name, product_sku, product_image_url, product_brand, product_category,
       status, site_access_code_id, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.conversationId,
      input.messageId,
      input.productId,
      input.productName,
      input.productSku,
      input.productImageUrl,
      input.productBrand,
      input.productCategory,
      input.status ?? 'pending',
      input.siteAccessCodeId ?? null,
      input.userId ?? null,
    ]
  )
  const rows = await queryDb<ChatQuoteRequestRow[]>(
    `SELECT * FROM chat_quote_requests WHERE id = ? LIMIT 1`,
    [id]
  )
  const row = rows[0]
  if (!row) throw new Error('CHAT_QUOTE_CREATE_FAILED')
  return row
}

