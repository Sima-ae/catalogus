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
export type ChatMessageType = 'text' | 'quote' | 'system' | 'supplier_reply'

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
  deleted_at?: string | null
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
  deleted_at?: string | null
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
  supplier_message_id: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
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
       AND deleted_at IS NULL
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
       WHERE conversation_id = ? AND deleted_at IS NULL AND created_at > ?
       ORDER BY created_at ASC
       LIMIT ?`,
      [conversationId, since, limit]
    )
  }
  return queryDb<ChatMessageRow[]>(
    `SELECT * FROM chat_messages
     WHERE conversation_id = ? AND deleted_at IS NULL
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

export async function getChatQuoteBySupplierConversationId(
  supplierConversationId: string
): Promise<ChatQuoteRequestRow | null> {
  const rows = await queryDb<ChatQuoteRequestRow[]>(
    `SELECT * FROM chat_quote_requests
     WHERE supplier_conversation_id = ? AND deleted_at IS NULL
     ORDER BY updated_at DESC
     LIMIT 1`,
    [supplierConversationId]
  )
  return rows[0] ?? null
}

/** Copy supplier price/text replies into the buyer thread for admin visibility (hidden from buyers). */
export async function mirrorSupplierReplyToBuyerThread(input: {
  supplierConversationId: string
  supplierSessionId: string
  replyText: string
}): Promise<ChatMessageRow | null> {
  const quote = await getChatQuoteBySupplierConversationId(input.supplierConversationId)
  if (!quote) return null

  const supplierSession = await getChatParticipantSessionById(input.supplierSessionId)
  const supplierLabel = supplierSession?.display_label?.trim() || 'Supplier'
  const trimmed = input.replyText.trim()
  if (!trimmed) return null

  return createChatMessage({
    conversationId: quote.conversation_id,
    senderSessionId: input.supplierSessionId,
    senderRole: 'seller',
    messageType: 'supplier_reply',
    body: `${supplierLabel}: ${trimmed}`,
  })
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

export type ChatMessageWithQuote = ChatMessageRow & {
  quote: ChatQuoteRequestRow | null
}

export type BuyerThreadInboxItem = {
  id: string
  status: ChatConversationStatus
  buyerLabel: string
  accessCode: string | null
  lastMessagePreview: string | null
  pendingQuoteCount: number
  updated_at: string
}

export type QuoteInboxItem = ChatQuoteRequestRow & {
  buyerLabel: string
  accessCode: string | null
}

export type SupplierThreadInboxItem = {
  id: string
  status: ChatConversationStatus
  updated_at: string
  quoteId: string | null
  productName: string | null
  productSku: string | null
  productImageUrl: string | null
  quoteStatus: ChatQuoteStatus | null
  productId?: string | null
}

export type SellerUserOption = {
  id: string
  name: string | null
  email: string
}

export async function findChatSessionForUser(
  userId: string,
  participantType: ChatParticipantType
): Promise<ChatParticipantSessionRow | null> {
  const rows = await queryDb<ChatParticipantSessionRow[]>(
    `SELECT * FROM chat_participant_sessions
     WHERE user_id = ? AND participant_type = ?
     ORDER BY COALESCE(last_seen_at, created_at) DESC, created_at DESC
     LIMIT 1`,
    [userId, participantType]
  )
  return rows[0] ?? null
}

export async function findPricelistGuestSession(
  pricelistOwnerId: string
): Promise<ChatParticipantSessionRow | null> {
  const rows = await queryDb<ChatParticipantSessionRow[]>(
    `SELECT * FROM chat_participant_sessions
     WHERE participant_type = 'pricelist_guest' AND pricelist_owner_id = ?
     ORDER BY COALESCE(last_seen_at, created_at) DESC, created_at DESC
     LIMIT 1`,
    [pricelistOwnerId]
  )
  return rows[0] ?? null
}

export async function getChatConversationById(
  id: string,
  options?: { includeDeleted?: boolean }
): Promise<ChatConversationRow | null> {
  const deletedClause = options?.includeDeleted ? '' : ' AND deleted_at IS NULL'
  const rows = await queryDb<ChatConversationRow[]>(
    `SELECT * FROM chat_conversations WHERE id = ?${deletedClause} LIMIT 1`,
    [id]
  )
  return rows[0] ?? null
}

function normalizeQuoteProductName(name: string | null | undefined): string {
  const trimmed = name?.trim()
  if (!trimmed || trimmed === '—' || trimmed === '-') return 'Unnamed product'
  return trimmed
}

function formatBuyerLabel(input: {
  participant_type: string
  display_label: string | null
  access_code: string | null
  user_name: string | null
  user_email: string | null
}): string {
  if (input.participant_type === 'site_code' && input.access_code) return input.access_code
  if (input.participant_type === 'site_password') return 'Site visitor'
  const name = input.user_name?.trim()
  if (name) return name
  const email = input.user_email?.trim()
  if (email) return email
  if (input.participant_type === 'buyer_user') return 'Buyer'
  if (input.participant_type === 'site_code') return input.access_code?.trim() || 'Access code'
  return 'Site visitor'
}

export async function listBuyerThreadsForAdmin(limit = 100): Promise<BuyerThreadInboxItem[]> {
  const capped = Math.min(200, Math.max(1, Math.floor(limit)))
  const rows = await queryDb<
    {
      id: string
      status: ChatConversationStatus
      updated_at: string
      participant_type: string
      display_label: string | null
      access_code: string | null
      user_name: string | null
      user_email: string | null
      pending_quote_count: number
      last_body: string | null
      last_type: string | null
    }[]
  >(
    `SELECT
       c.id,
       c.status,
       c.updated_at,
       s.participant_type,
       s.display_label,
       sac.code AS access_code,
       u.name AS user_name,
       u.email AS user_email,
       (
         SELECT COUNT(*)
         FROM chat_quote_requests q
         WHERE q.conversation_id = c.id AND q.deleted_at IS NULL
           AND q.status IN ('pending', 'with_supplier')
       ) AS pending_quote_count,
       (
         SELECT m.body
         FROM chat_messages m
         WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
         ORDER BY m.created_at DESC
         LIMIT 1
       ) AS last_body,
       (
         SELECT m.message_type
         FROM chat_messages m
         WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
         ORDER BY m.created_at DESC
         LIMIT 1
       ) AS last_type
     FROM chat_conversations c
     INNER JOIN chat_participant_sessions s ON s.id = c.buyer_session_id
     LEFT JOIN site_access_codes sac ON sac.id = s.site_access_code_id
     LEFT JOIN users u ON u.id = s.user_id
     WHERE c.type = 'buyer_thread'
       AND c.deleted_at IS NULL
     ORDER BY c.updated_at DESC
     LIMIT ?`,
    [capped]
  )

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    buyerLabel: formatBuyerLabel(row),
    accessCode: row.access_code,
    lastMessagePreview:
      row.last_type === 'quote'
        ? '[Quote request]'
        : row.last_body?.trim() || (row.last_type === 'system' ? '[System]' : null),
    pendingQuoteCount: Number(row.pending_quote_count ?? 0),
    updated_at: row.updated_at,
  }))
}

export async function listQuotesForAdmin(options?: {
  status?: ChatQuoteStatus | 'pending_and_supplier' | 'all'
  limit?: number
}): Promise<QuoteInboxItem[]> {
  const capped = Math.min(200, Math.max(1, Math.floor(options?.limit ?? 100)))
  const statusFilter = options?.status ?? 'pending_and_supplier'
  const statusClause =
    statusFilter === 'pending_and_supplier'
      ? `q.status IN ('pending', 'with_supplier')`
      : statusFilter === 'all'
        ? '1=1'
        : 'q.status = ?'
  const params: unknown[] = statusFilter === 'all' || statusFilter === 'pending_and_supplier' ? [] : [statusFilter]

  const rows = await queryDb<
    (ChatQuoteRequestRow & {
      participant_type: string
      display_label: string | null
      access_code: string | null
      user_name: string | null
      user_email: string | null
    })[]
  >(
    `SELECT
       q.*,
       s.participant_type,
       s.display_label,
       sac.code AS access_code,
       u.name AS user_name,
       u.email AS user_email
     FROM chat_quote_requests q
     INNER JOIN chat_conversations c ON c.id = q.conversation_id AND c.deleted_at IS NULL
     LEFT JOIN chat_participant_sessions s ON s.id = c.buyer_session_id
     LEFT JOIN site_access_codes sac ON sac.id = s.site_access_code_id
     LEFT JOIN users u ON u.id = s.user_id
     WHERE q.deleted_at IS NULL AND ${statusClause}
     ORDER BY q.updated_at DESC
     LIMIT ?`,
    [...params, capped]
  )

  return rows.map((row) => {
    const { participant_type, display_label, access_code, user_name, user_email, ...quote } = row
    return {
      ...quote,
      conversation_id: quote.conversation_id,
      product_name: normalizeQuoteProductName(quote.product_name),
      buyerLabel: formatBuyerLabel({
        participant_type: participant_type ?? 'site_password',
        display_label,
        access_code,
        user_name,
        user_email,
      }),
      accessCode: access_code,
    }
  })
}

export async function getChatQuoteById(
  id: string,
  options?: { includeDeleted?: boolean }
): Promise<ChatQuoteRequestRow | null> {
  const deletedClause = options?.includeDeleted ? '' : ' AND deleted_at IS NULL'
  const rows = await queryDb<ChatQuoteRequestRow[]>(
    `SELECT * FROM chat_quote_requests WHERE id = ?${deletedClause} LIMIT 1`,
    [id]
  )
  return rows[0] ?? null
}

export async function updateChatQuoteRequest(
  id: string,
  patch: {
    status?: ChatQuoteStatus
    supplierConversationId?: string | null
    supplierMessageId?: string | null
  }
): Promise<ChatQuoteRequestRow | null> {
  const sets: string[] = []
  const params: unknown[] = []
  if (patch.status !== undefined) {
    sets.push('status = ?')
    params.push(patch.status)
  }
  if (patch.supplierConversationId !== undefined) {
    sets.push('supplier_conversation_id = ?')
    params.push(patch.supplierConversationId)
  }
  if (patch.supplierMessageId !== undefined) {
    sets.push('supplier_message_id = ?')
    params.push(patch.supplierMessageId)
  }
  if (!sets.length) return getChatQuoteById(id)
  params.push(id)
  await queryDb(`UPDATE chat_quote_requests SET ${sets.join(', ')} WHERE id = ?`, params)
  return getChatQuoteById(id)
}

export async function findChatSessionForPricelistSupplier(input: {
  userId?: string | null
  pricelistOwnerId: string
  participantType: 'seller_user' | 'pricelist_guest'
}): Promise<ChatParticipantSessionRow | null> {
  if (input.participantType === 'seller_user' && input.userId) {
    const rows = await queryDb<ChatParticipantSessionRow[]>(
      `SELECT * FROM chat_participant_sessions
       WHERE user_id = ? AND participant_type = 'seller_user' AND pricelist_owner_id = ?
       ORDER BY COALESCE(last_seen_at, created_at) DESC
       LIMIT 1`,
      [input.userId, input.pricelistOwnerId]
    )
    return rows[0] ?? null
  }
  return findPricelistGuestSession(input.pricelistOwnerId)
}

export async function ensurePricelistPageChatSession(
  pricelistOwnerId: string,
  displayLabel: string
): Promise<ChatParticipantSessionRow> {
  const existing = await findPricelistGuestSession(pricelistOwnerId)
  if (existing) {
    if (existing.display_label !== displayLabel) {
      await queryDb(`UPDATE chat_participant_sessions SET display_label = ? WHERE id = ?`, [
        displayLabel,
        existing.id,
      ])
      return (await getChatParticipantSessionById(existing.id))!
    }
    return existing
  }
  return createChatParticipantSession({
    participantType: 'pricelist_guest',
    pricelistOwnerId,
    displayLabel,
  })
}

export async function listSupplierThreadsForPricelist(
  pricelistOwnerId: string,
  limit = 50
): Promise<SupplierThreadInboxItem[]> {
  const capped = Math.min(100, Math.max(1, Math.floor(limit)))
  const rows = await queryDb<
    {
      id: string
      status: ChatConversationStatus
      updated_at: string
      quote_id: string | null
      product_name: string | null
      product_sku: string | null
      product_image_url: string | null
      quote_status: ChatQuoteStatus | null
      product_id: string | null
    }[]
  >(
    `SELECT
       c.id,
       c.status,
       c.updated_at,
       q.id AS quote_id,
       q.product_name,
       q.product_sku,
       q.product_image_url,
       q.status AS quote_status,
       q.product_id
     FROM chat_conversations c
     LEFT JOIN chat_quote_requests q ON q.supplier_conversation_id = c.id AND q.deleted_at IS NULL
     WHERE c.type = 'supplier_thread' AND c.pricelist_owner_id = ? AND c.deleted_at IS NULL
     ORDER BY c.updated_at DESC
     LIMIT ?`,
    [pricelistOwnerId, capped]
  )
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    updated_at: row.updated_at,
    quoteId: row.quote_id,
    productName: row.product_name,
    productSku: row.product_sku,
    productImageUrl: row.product_image_url,
    quoteStatus: row.quote_status,
    productId: row.product_id,
  }))
}

export async function createSupplierConversation(input: {
  supplierSessionId: string
  assignedAdminUserId: string
  pricelistOwnerId?: string | null
}): Promise<ChatConversationRow> {
  const id = randomUUID()
  await queryDb(
    `INSERT INTO chat_conversations
      (id, type, status, supplier_session_id, assigned_admin_user_id, pricelist_owner_id)
     VALUES (?, 'supplier_thread', 'open', ?, ?, ?)`,
    [id, input.supplierSessionId, input.assignedAdminUserId, input.pricelistOwnerId ?? null]
  )
  return getChatConversationByIdOrThrow(id)
}

export async function listSupplierThreadsForSession(
  supplierSessionId: string,
  limit = 50
): Promise<SupplierThreadInboxItem[]> {
  const capped = Math.min(100, Math.max(1, Math.floor(limit)))
  const rows = await queryDb<
    {
      id: string
      status: ChatConversationStatus
      updated_at: string
      quote_id: string | null
      product_name: string | null
      product_sku: string | null
      product_image_url: string | null
      quote_status: ChatQuoteStatus | null
    }[]
  >(
    `SELECT
       c.id,
       c.status,
       c.updated_at,
       q.id AS quote_id,
       q.product_name,
       q.product_sku,
       q.product_image_url,
       q.status AS quote_status
     FROM chat_conversations c
     LEFT JOIN chat_quote_requests q ON q.supplier_conversation_id = c.id AND q.deleted_at IS NULL
     WHERE c.type = 'supplier_thread' AND c.supplier_session_id = ? AND c.deleted_at IS NULL
     ORDER BY c.updated_at DESC
     LIMIT ?`,
    [supplierSessionId, capped]
  )
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    updated_at: row.updated_at,
    quoteId: row.quote_id,
    productName: row.product_name,
    productSku: row.product_sku,
    productImageUrl: row.product_image_url,
    quoteStatus: row.quote_status,
  }))
}

export async function listChatMessagesWithQuotes(
  conversationId: string,
  options?: {
    since?: string | null
    limit?: number
    excludeMessageTypes?: ChatMessageType[]
  }
): Promise<ChatMessageWithQuote[]> {
  const limit = Math.min(500, Math.max(1, Math.floor(options?.limit ?? 200)))
  const since = options?.since?.trim() || null
  const sinceClause = since ? 'AND m.created_at > ?' : ''
  const excluded = (options?.excludeMessageTypes ?? []).filter(Boolean)
  const excludeClause = excluded.length
    ? `AND m.message_type NOT IN (${excluded.map(() => '?').join(', ')})`
    : ''
  const params: unknown[] = since
    ? [conversationId, ...excluded, since, limit]
    : [conversationId, ...excluded, limit]

  const rows = await queryDb<
    (ChatMessageRow & {
      quote_id: string | null
      quote_conversation_id: string | null
      quote_message_id: string | null
      quote_product_id: string | null
      quote_product_name: string | null
      quote_product_sku: string | null
      quote_product_image_url: string | null
      quote_product_brand: string | null
      quote_product_category: string | null
      quote_status: ChatQuoteStatus | null
      quote_site_access_code_id: string | null
      quote_user_id: string | null
      quote_supplier_conversation_id: string | null
      quote_supplier_message_id: string | null
      quote_created_at: string | null
      quote_updated_at: string | null
    })[]
  >(
    `SELECT
       m.*,
       q.id AS quote_id,
       q.conversation_id AS quote_conversation_id,
       q.message_id AS quote_message_id,
       q.product_id AS quote_product_id,
       q.product_name AS quote_product_name,
       q.product_sku AS quote_product_sku,
       q.product_image_url AS quote_product_image_url,
       q.product_brand AS quote_product_brand,
       q.product_category AS quote_product_category,
       q.status AS quote_status,
       q.site_access_code_id AS quote_site_access_code_id,
       q.user_id AS quote_user_id,
       q.supplier_conversation_id AS quote_supplier_conversation_id,
       q.supplier_message_id AS quote_supplier_message_id,
       q.created_at AS quote_created_at,
       q.updated_at AS quote_updated_at
     FROM chat_messages m
     LEFT JOIN chat_quote_requests q ON q.deleted_at IS NULL
       AND (q.message_id = m.id OR q.supplier_message_id = m.id)
     WHERE m.conversation_id = ? AND m.deleted_at IS NULL ${excludeClause} ${sinceClause}
     ORDER BY m.created_at ASC
     LIMIT ?`,
    params
  )

  return rows.map((row) => {
    const quote =
      row.quote_id != null
        ? {
            id: row.quote_id,
            conversation_id: row.quote_conversation_id!,
            message_id: row.quote_message_id!,
            product_id: row.quote_product_id,
            product_name: normalizeQuoteProductName(row.quote_product_name),
            product_sku: row.quote_product_sku,
            product_image_url: row.quote_product_image_url,
            product_brand: row.quote_product_brand,
            product_category: row.quote_product_category,
            status: row.quote_status!,
            site_access_code_id: row.quote_site_access_code_id,
            user_id: row.quote_user_id,
            supplier_conversation_id: row.quote_supplier_conversation_id,
            supplier_message_id: row.quote_supplier_message_id,
            created_at: row.quote_created_at!,
            updated_at: row.quote_updated_at!,
          }
        : null
    return {
      id: row.id,
      conversation_id: row.conversation_id,
      sender_session_id: row.sender_session_id,
      sender_role: row.sender_role,
      message_type: row.message_type,
      body: row.body,
      created_at: row.created_at,
      read_at: row.read_at,
      quote,
    }
  })
}

export async function getProductSellerId(productId: string): Promise<string | null> {
  try {
    const rows = await queryDb<{ author_id: string | null }[]>(
      `SELECT author_id FROM products WHERE id = ? LIMIT 1`,
      [productId]
    )
    const id = rows[0]?.author_id?.trim()
    return id || null
  } catch {
    return null
  }
}

export async function listSellerUsers(): Promise<SellerUserOption[]> {
  const rows = await queryDb<SellerUserOption[]>(
    `SELECT id, name, email FROM users WHERE role = 'seller' ORDER BY COALESCE(name, email) ASC`
  )
  return rows
}

export async function ensureSellerChatSession(sellerUserId: string, label?: string | null) {
  const existing = await findChatSessionForUser(sellerUserId, 'seller_user')
  if (existing) return existing
  return createChatParticipantSession({
    participantType: 'seller_user',
    userId: sellerUserId,
    displayLabel: label ?? null,
  })
}

export function buyerSessionOwnsConversation(
  sessionId: string,
  conversation: ChatConversationRow
): boolean {
  return conversation.type === 'buyer_thread' && conversation.buyer_session_id === sessionId
}

export function supplierCanAccessConversation(
  pricelistOwnerId: string | null,
  conversation: ChatConversationRow
): boolean {
  if (conversation.type !== 'supplier_thread') return false
  if (!pricelistOwnerId || !conversation.pricelist_owner_id) return false
  return conversation.pricelist_owner_id === pricelistOwnerId
}

export function supplierSessionOwnsConversation(
  sessionId: string,
  conversation: ChatConversationRow
): boolean {
  return conversation.type === 'supplier_thread' && conversation.supplier_session_id === sessionId
}

export type ChatTrashKind = 'thread' | 'message' | 'quote'

export type ChatTrashItem = {
  id: string
  kind: ChatTrashKind
  label: string
  subtitle: string | null
  deleted_at: string
  conversation_id: string | null
  thread_type: ChatConversationType | null
}

async function markMessageDeleted(id: string): Promise<void> {
  await queryDb(`UPDATE chat_messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`, [
    id,
  ])
}

async function markQuoteDeleted(id: string): Promise<void> {
  const quote = await getChatQuoteById(id, { includeDeleted: true })
  if (!quote || quote.deleted_at) return
  await queryDb(`UPDATE chat_quote_requests SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, [id])
  if (quote.message_id) await markMessageDeleted(quote.message_id)
  if (quote.supplier_message_id) await markMessageDeleted(quote.supplier_message_id)
}

export async function softDeleteChatMessage(id: string): Promise<boolean> {
  const rows = await queryDb<{ id: string }[]>(
    `SELECT id FROM chat_messages WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [id]
  )
  if (!rows[0]) return false
  await markMessageDeleted(id)
  const quoteRows = await queryDb<{ id: string }[]>(
    `SELECT id FROM chat_quote_requests
     WHERE (message_id = ? OR supplier_message_id = ?) AND deleted_at IS NULL`,
    [id, id]
  )
  for (const q of quoteRows) {
    await queryDb(`UPDATE chat_quote_requests SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, [q.id])
  }
  return true
}

export async function softDeleteChatQuote(id: string): Promise<boolean> {
  const quote = await getChatQuoteById(id)
  if (!quote) return false
  await markQuoteDeleted(id)
  return true
}

export async function softDeleteChatConversation(id: string): Promise<boolean> {
  const conv = await getChatConversationById(id)
  if (!conv) return false

  await queryDb(`UPDATE chat_conversations SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, [id])
  await queryDb(
    `UPDATE chat_messages SET deleted_at = CURRENT_TIMESTAMP WHERE conversation_id = ? AND deleted_at IS NULL`,
    [id]
  )
  await queryDb(
    `UPDATE chat_quote_requests SET deleted_at = CURRENT_TIMESTAMP
     WHERE (conversation_id = ? OR supplier_conversation_id = ?) AND deleted_at IS NULL`,
    [id, id]
  )

  if (conv.type === 'buyer_thread') {
    const linked = await queryDb<{ supplier_conversation_id: string | null }[]>(
      `SELECT supplier_conversation_id FROM chat_quote_requests
       WHERE conversation_id = ? AND supplier_conversation_id IS NOT NULL`,
      [id]
    )
    for (const row of linked) {
      const supplierId = row.supplier_conversation_id
      if (!supplierId) continue
      await queryDb(
        `UPDATE chat_conversations SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`,
        [supplierId]
      )
      await queryDb(
        `UPDATE chat_messages SET deleted_at = CURRENT_TIMESTAMP WHERE conversation_id = ? AND deleted_at IS NULL`,
        [supplierId]
      )
    }
  }

  return true
}

export async function listChatTrash(limit = 200): Promise<ChatTrashItem[]> {
  const capped = Math.min(500, Math.max(1, Math.floor(limit)))
  const threads = await queryDb<
    {
      id: string
      type: ChatConversationType
      deleted_at: string
      buyer_label: string | null
      product_name: string | null
    }[]
  >(
    `SELECT
       c.id,
       c.type,
       c.deleted_at,
       COALESCE(sac.code, u.name, u.email, s.display_label, 'Thread') AS buyer_label,
       (
         SELECT q.product_name FROM chat_quote_requests q
         WHERE q.supplier_conversation_id = c.id
         ORDER BY q.created_at DESC LIMIT 1
       ) AS product_name
     FROM chat_conversations c
     LEFT JOIN chat_participant_sessions s ON s.id = c.buyer_session_id
     LEFT JOIN site_access_codes sac ON sac.id = s.site_access_code_id
     LEFT JOIN users u ON u.id = s.user_id
     WHERE c.deleted_at IS NOT NULL
     ORDER BY c.deleted_at DESC
     LIMIT ?`,
    [capped]
  )

  const messages = await queryDb<
    { id: string; deleted_at: string; body: string | null; message_type: string; conversation_id: string }[]
  >(
    `SELECT m.id, m.deleted_at, m.body, m.message_type, m.conversation_id
     FROM chat_messages m
     INNER JOIN chat_conversations c ON c.id = m.conversation_id
     WHERE m.deleted_at IS NOT NULL AND c.deleted_at IS NULL
     ORDER BY m.deleted_at DESC
     LIMIT ?`,
    [capped]
  )

  const quotes = await queryDb<
    {
      id: string
      deleted_at: string
      product_name: string
      product_sku: string | null
      conversation_id: string
    }[]
  >(
    `SELECT q.id, q.deleted_at, q.product_name, q.product_sku, q.conversation_id
     FROM chat_quote_requests q
     INNER JOIN chat_conversations c ON c.id = q.conversation_id
     WHERE q.deleted_at IS NOT NULL AND c.deleted_at IS NULL
     ORDER BY q.deleted_at DESC
     LIMIT ?`,
    [capped]
  )

  const items: ChatTrashItem[] = [
    ...threads.map((t) => ({
      id: t.id,
      kind: 'thread' as const,
      label:
        t.type === 'supplier_thread'
          ? t.product_name?.trim() || 'Supplier thread'
          : t.buyer_label?.trim() || 'Buyer thread',
      subtitle: t.type === 'supplier_thread' ? 'Supplier thread' : 'Buyer thread',
      deleted_at: t.deleted_at,
      conversation_id: t.id,
      thread_type: t.type,
    })),
    ...messages.map((m) => ({
      id: m.id,
      kind: 'message' as const,
      label:
        m.message_type === 'quote'
          ? '[Quote message]'
          : m.body?.trim()?.slice(0, 120) || `[${m.message_type}]`,
      subtitle: 'Message',
      deleted_at: m.deleted_at,
      conversation_id: m.conversation_id,
      thread_type: null,
    })),
    ...quotes.map((q) => ({
      id: q.id,
      kind: 'quote' as const,
      label: q.product_name,
      subtitle: q.product_sku ? `SKU ${q.product_sku}` : 'Quote request',
      deleted_at: q.deleted_at,
      conversation_id: q.conversation_id,
      thread_type: null,
    })),
  ]

  items.sort((a, b) => String(b.deleted_at).localeCompare(String(a.deleted_at)))
  return items.slice(0, capped)
}

export async function restoreChatTrashItem(kind: ChatTrashKind, id: string): Promise<boolean> {
  if (kind === 'thread') {
    const conv = await getChatConversationById(id, { includeDeleted: true })
    if (!conv?.deleted_at) return false
    await queryDb(`UPDATE chat_conversations SET deleted_at = NULL WHERE id = ?`, [id])
    await queryDb(`UPDATE chat_messages SET deleted_at = NULL WHERE conversation_id = ?`, [id])
    await queryDb(
      `UPDATE chat_quote_requests SET deleted_at = NULL
       WHERE conversation_id = ? OR supplier_conversation_id = ?`,
      [id, id]
    )
    return true
  }
  if (kind === 'message') {
    const rows = await queryDb<{ id: string }[]>(
      `SELECT id FROM chat_messages WHERE id = ? AND deleted_at IS NOT NULL LIMIT 1`,
      [id]
    )
    if (!rows[0]) return false
    await queryDb(`UPDATE chat_messages SET deleted_at = NULL WHERE id = ?`, [id])
    return true
  }
  const quote = await getChatQuoteById(id, { includeDeleted: true })
  if (!quote?.deleted_at) return false
  await queryDb(`UPDATE chat_quote_requests SET deleted_at = NULL WHERE id = ?`, [id])
  if (quote.message_id) {
    await queryDb(`UPDATE chat_messages SET deleted_at = NULL WHERE id = ?`, [quote.message_id])
  }
  if (quote.supplier_message_id) {
    await queryDb(`UPDATE chat_messages SET deleted_at = NULL WHERE id = ?`, [quote.supplier_message_id])
  }
  return true
}

export async function permanentlyDeleteChatTrashItem(kind: ChatTrashKind, id: string): Promise<boolean> {
  if (kind === 'thread') {
    const conv = await getChatConversationById(id, { includeDeleted: true })
    if (!conv?.deleted_at) return false
    await queryDb(`DELETE FROM chat_quote_requests WHERE conversation_id = ? OR supplier_conversation_id = ?`, [
      id,
      id,
    ])
    await queryDb(`DELETE FROM chat_messages WHERE conversation_id = ?`, [id])
    await queryDb(`DELETE FROM chat_conversations WHERE id = ?`, [id])
    return true
  }
  if (kind === 'message') {
    const rows = await queryDb<{ id: string; deleted_at: string | null }[]>(
      `SELECT id, deleted_at FROM chat_messages WHERE id = ? LIMIT 1`,
      [id]
    )
    const row = rows[0]
    if (!row?.deleted_at) return false
    await queryDb(`DELETE FROM chat_quote_requests WHERE message_id = ? OR supplier_message_id = ?`, [id, id])
    await queryDb(`DELETE FROM chat_messages WHERE id = ?`, [id])
    return true
  }
  const quote = await getChatQuoteById(id, { includeDeleted: true })
  if (!quote?.deleted_at) return false
  if (quote.message_id) await queryDb(`DELETE FROM chat_messages WHERE id = ?`, [quote.message_id])
  if (quote.supplier_message_id) {
    await queryDb(`DELETE FROM chat_messages WHERE id = ?`, [quote.supplier_message_id])
  }
  await queryDb(`DELETE FROM chat_quote_requests WHERE id = ?`, [id])
  return true
}

export async function emptyChatTrash(): Promise<{ deleted: number }> {
  const items = await listChatTrash(500)
  let deleted = 0
  for (const item of items) {
    const ok = await permanentlyDeleteChatTrashItem(item.kind, item.id)
    if (ok) deleted += 1
  }
  return { deleted }
}

