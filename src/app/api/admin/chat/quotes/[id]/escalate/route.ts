import { NextRequest, NextResponse } from 'next/server'
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { resolveAdminChatContext } from '@/lib/chat-auth'
import { getProductCuratedPricelistId, listPricelistPages } from '@/lib/pricelist-pages-db'
import {
  createChatMessage,
  createSupplierConversation,
  ensurePricelistPageChatSession,
  getChatConversationById,
  getChatQuoteById,
  updateChatQuoteRequest,
} from '@/lib/chat-db'
import { encodeChatI18nBody } from '@/lib/chat-message-i18n'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  ensureEnvLoaded()
  const resolved = await resolveAdminChatContext(request)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const { id: quoteId } = await context.params
  const quote = await getChatQuoteById(quoteId)
  if (!quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  if (quote.supplier_conversation_id) {
    return NextResponse.json({
      ok: true,
      supplierConversationId: quote.supplier_conversation_id,
      alreadyEscalated: true,
    })
  }

  const buyerConversation = await getChatConversationById(quote.conversation_id)
  if (!buyerConversation || buyerConversation.type !== 'buyer_thread') {
    return NextResponse.json({ error: 'Buyer conversation not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  let pricelistPageId = String(body?.pricelistPageId ?? body?.pricelistOwnerId ?? '').trim()

  if (!pricelistPageId && quote.product_id) {
    pricelistPageId = (await getProductCuratedPricelistId(quote.product_id)) ?? ''
  }

  if (!pricelistPageId) {
    return NextResponse.json({ error: 'pricelistPageId is required' }, { status: 400 })
  }

  const pages = await listPricelistPages({ activeOnly: true })
  const page = pages.find((p) => p.id === pricelistPageId)
  if (!page) {
    return NextResponse.json({ error: 'Invalid pricelist page' }, { status: 400 })
  }

  const pageSession = await ensurePricelistPageChatSession(page.id, page.label)

  const supplierConversation = await createSupplierConversation({
    supplierSessionId: pageSession.id,
    assignedAdminUserId: resolved.ctx.actor.userId,
    pricelistOwnerId: page.id,
  })

  const supplierQuoteMessage = await createChatMessage({
    conversationId: supplierConversation.id,
    senderSessionId: resolved.ctx.session.id,
    senderRole: 'admin',
    messageType: 'quote',
    body: null,
  })

  await updateChatQuoteRequest(quoteId, {
    status: 'with_supplier',
    supplierConversationId: supplierConversation.id,
    supplierMessageId: supplierQuoteMessage.id,
  })

  await createChatMessage({
    conversationId: supplierConversation.id,
    senderSessionId: resolved.ctx.session.id,
    senderRole: 'system',
    messageType: 'system',
    body: encodeChatI18nBody('chat.system.forwardQuote', {
      productName: quote.product_name,
      sku: quote.product_sku ?? '',
    }),
  })

  return NextResponse.json({
    ok: true,
    supplierConversationId: supplierConversation.id,
    pricelistPageId: page.id,
    pricelistLabel: page.label,
  })
}
