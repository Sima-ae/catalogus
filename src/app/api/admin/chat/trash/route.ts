import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor, superAdminDenial } from '@/lib/admin-api-auth'
import { listChatTrash } from '@/lib/chat-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  const denied = superAdminDenial(auth)
  if (denied) return denied

  const limit = Number(request.nextUrl.searchParams.get('limit') ?? 200)
  const items = await listChatTrash(limit)
  return NextResponse.json({ items })
}
