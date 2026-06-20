import { NextRequest, NextResponse } from 'next/server'
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { resolveChatViewer } from '@/lib/chat-auth'
import {
  buyerSessionOwnsConversation,
  createChatMessage,
  getChatConversationById,
  listChatMessagesWithQuotes,
} from '@/lib/chat-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  ensureEnvLoaded()
  const resolved = await resolveChatViewer(request, { allowPricelistGuest: true })
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const conversationId = request.nextUrl.searchParams.get('conversationId')?.trim() || ''
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
  }

  const conversation = await getChatConversationById(conversationId)
  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const { viewer } = resolved
  if (
    conversation.type !== 'buyer_thread' ||
    !buyerSessionOwnsConversation(viewer.session.id, conversation)
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const since = request.nextUrl.searchParams.get('since')
  const items = await listChatMessagesWithQuotes(conversationId, {
    since,
    limit: 500,
    excludeMessageTypes: ['supplier_reply'],
  })
  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  ensureEnvLoaded()
  const resolved = await resolveChatViewer(request, { allowPricelistGuest: true })
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const { viewer } = resolved
  const body = await request.json().catch(() => ({}))
  const conversationId = String(body?.conversationId ?? '').trim()
  const text = String(body?.text ?? '').trim()

  if (!conversationId || !text) {
    return NextResponse.json({ error: 'conversationId and text are required' }, { status: 400 })
  }

  const senderRole =
    viewer.session.participant_type === 'admin_user'
      ? 'admin'
      : viewer.session.participant_type === 'seller_user' || viewer.session.participant_type === 'pricelist_guest'
        ? 'seller'
        : 'visitor'

  if (senderRole === 'seller') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const conversation = await getChatConversationById(conversationId)
  if (
    !conversation ||
    conversation.type !== 'buyer_thread' ||
    !buyerSessionOwnsConversation(viewer.session.id, conversation)
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const msg = await createChatMessage({
    conversationId,
    senderSessionId: viewer.session.id,
    senderRole,
    messageType: 'text',
    body: text.slice(0, 4000),
  })
  return NextResponse.json({ ok: true, message: msg })
}
