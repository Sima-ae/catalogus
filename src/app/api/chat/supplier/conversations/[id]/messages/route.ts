import { NextRequest, NextResponse } from 'next/server'
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { resolveSupplierChatViewer } from '@/lib/chat-auth'
import {
  createChatMessage,
  getChatConversationById,
  listChatMessagesWithQuotes,
  supplierSessionOwnsConversation,
} from '@/lib/chat-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  ensureEnvLoaded()
  const resolved = await resolveSupplierChatViewer(request)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const { id } = await context.params
  const conversation = await getChatConversationById(id)
  if (!conversation || conversation.type !== 'supplier_thread') {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  if (!supplierSessionOwnsConversation(resolved.viewer.session.id, conversation)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const since = request.nextUrl.searchParams.get('since')
  const items = await listChatMessagesWithQuotes(id, { since, limit: 200 })
  return NextResponse.json({ items, conversation })
}

export async function POST(request: NextRequest, context: RouteContext) {
  ensureEnvLoaded()
  const resolved = await resolveSupplierChatViewer(request)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const { id } = await context.params
  const conversation = await getChatConversationById(id)
  if (!conversation || conversation.type !== 'supplier_thread') {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  if (!supplierSessionOwnsConversation(resolved.viewer.session.id, conversation)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const text = String(body?.text ?? '').trim()
  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const message = await createChatMessage({
    conversationId: id,
    senderSessionId: resolved.viewer.session.id,
    senderRole: 'seller',
    messageType: 'text',
    body: text.slice(0, 4000),
  })

  return NextResponse.json({ ok: true, message })
}
