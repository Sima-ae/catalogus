import { NextRequest, NextResponse } from 'next/server'
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { resolveAdminChatContext } from '@/lib/chat-auth'
import { getChatQuoteById, updateChatQuoteRequest, type ChatQuoteStatus } from '@/lib/chat-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

const ALLOWED_STATUSES = new Set<ChatQuoteStatus>(['pending', 'with_supplier', 'answered', 'closed'])

export async function PATCH(request: NextRequest, context: RouteContext) {
  ensureEnvLoaded()
  const resolved = await resolveAdminChatContext(request)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const { id } = await context.params
  const quote = await getChatQuoteById(id)
  if (!quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const status = String(body?.status ?? '').trim() as ChatQuoteStatus
  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const updated = await updateChatQuoteRequest(id, { status })
  return NextResponse.json({ ok: true, quote: updated })
}
