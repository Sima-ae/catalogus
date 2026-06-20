import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor, superAdminDenial } from '@/lib/admin-api-auth'
import { permanentlyDeleteChatTrashItem, type ChatTrashKind } from '@/lib/chat-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const KINDS = new Set<ChatTrashKind>(['thread', 'message', 'quote'])

export async function POST(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  const denied = superAdminDenial(auth)
  if (denied) return denied

  const body = await request.json().catch(() => ({}))
  const kind = String(body?.kind ?? '').trim() as ChatTrashKind
  const id = String(body?.id ?? '').trim()
  if (!KINDS.has(kind) || !id) {
    return NextResponse.json({ error: 'kind and id are required' }, { status: 400 })
  }

  const ok = await permanentlyDeleteChatTrashItem(kind, id)
  if (!ok) {
    return NextResponse.json({ error: 'Item not found in trash' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
