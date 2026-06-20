import { NextRequest, NextResponse } from 'next/server'
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { resolveChatViewer } from '@/lib/chat-auth'
import { getProductById } from '@/lib/products-db'
import { createChatMessage, createChatQuoteRequest } from '@/lib/chat-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  ensureEnvLoaded()
  const resolved = await resolveChatViewer(request, { allowPricelistGuest: true })
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const { viewer } = resolved
  const body = await request.json().catch(() => ({}))
  const conversationId = String(body?.conversationId ?? '').trim()
  const productId = String(body?.productId ?? '').trim()
  if (!conversationId || !productId) {
    return NextResponse.json({ error: 'conversationId and productId are required' }, { status: 400 })
  }

  const isBuyerThread =
    viewer.session.participant_type === 'site_password' ||
    viewer.session.participant_type === 'site_code' ||
    viewer.session.participant_type === 'buyer_user'
  if (!isBuyerThread) {
    return NextResponse.json({ error: 'Quote requests are not allowed for this account' }, { status: 403 })
  }

  const product = await getProductById(productId, { includePurchasePrice: false })
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const message = await createChatMessage({
    conversationId,
    senderSessionId: viewer.session.id,
    senderRole: 'visitor',
    messageType: 'quote',
    body: null,
  })

  const quote = await createChatQuoteRequest({
    conversationId,
    messageId: message.id,
    productId: product.id,
    productName: String(product.name ?? '').trim() || 'Unnamed product',
    productSku: product.sku ?? null,
    productImageUrl: product.image_url ?? null,
    productBrand: product.brand ?? null,
    productCategory: product.category ?? null,
    status: 'pending',
    siteAccessCodeId: viewer.siteAccessCodeId,
    userId: viewer.actor?.role === 'buyer' ? viewer.actor.userId : null,
  })

  return NextResponse.json({ ok: true, quoteId: quote.id, messageId: message.id })
}

