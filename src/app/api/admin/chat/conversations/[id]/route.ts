import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor, superAdminDenial } from '@/lib/admin-api-auth'
import { softDeleteChatConversation } from '@/lib/chat-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await verifyAdminActor(_request)
  const denied = superAdminDenial(auth)
  if (denied) return denied

  const { id } = await context.params
  const ok = await softDeleteChatConversation(id)
  if (!ok) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
