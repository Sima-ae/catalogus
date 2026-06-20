import { NextRequest, NextResponse } from 'next/server'
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { resolveAdminChatContext } from '@/lib/chat-auth'
import {
  createChatMessage,
  createSupplierConversation,
  ensureSellerChatSession,
  getChatConversationById,
  getChatQuoteById,
  getProductSellerId,
  listSellerUsers,
  updateChatQuoteRequest,
} from '@/lib/chat-db'
import { queryDb } from '@/lib/db'

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
  let sellerUserId = String(body?.sellerUserId ?? '').trim()

  if (!sellerUserId && quote.product_id) {
    sellerUserId = (await getProductSellerId(quote.product_id)) ?? ''
  }

  if (!sellerUserId) {
    const sellers = await listSellerUsers()
    if (sellers.length === 1) {
      sellerUserId = sellers[0].id
    }
  }

  if (!sellerUserId) {
    return NextResponse.json(
      { error: 'sellerUserId is required when product has no assigned seller' },
      { status: 400 }
    )
  }

  const sellerRows = await queryDb<{ id: string; name: string | null; email: string; role: string }[]>(
    'SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1',
    [sellerUserId]
  )
  const seller = sellerRows[0]
  if (!seller || seller.role !== 'seller') {
    return NextResponse.json({ error: 'Invalid seller' }, { status: 400 })
  }

  const supplierSession = await ensureSellerChatSession(
    seller.id,
    seller.name?.trim() || seller.email
  )

  const supplierConversation = await createSupplierConversation({
    supplierSessionId: supplierSession.id,
    assignedAdminUserId: resolved.ctx.actor.userId,
    pricelistOwnerId: buyerConversation.pricelist_owner_id,
  })

  await updateChatQuoteRequest(quoteId, {
    status: 'with_supplier',
    supplierConversationId: supplierConversation.id,
  })

  const productLine = [
    quote.product_name,
    quote.product_sku ? `SKU ${quote.product_sku}` : null,
    quote.product_brand,
  ]
    .filter(Boolean)
    .join(' · ')

  await createChatMessage({
    conversationId: supplierConversation.id,
    senderSessionId: resolved.ctx.session.id,
    senderRole: 'system',
    messageType: 'system',
    body: `Quote request from admin: ${productLine}`,
  })

  return NextResponse.json({
    ok: true,
    supplierConversationId: supplierConversation.id,
    sellerUserId: seller.id,
  })
}
