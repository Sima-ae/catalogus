import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor, superAdminDenial } from '@/lib/admin-api-auth'
import { emptyChatTrash } from '@/lib/chat-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  const denied = superAdminDenial(auth)
  if (denied) return denied

  const result = await emptyChatTrash()
  return NextResponse.json({ ok: true, ...result })
}
