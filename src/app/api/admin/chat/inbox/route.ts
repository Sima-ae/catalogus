import { NextRequest, NextResponse } from 'next/server'
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { resolveAdminChatContext } from '@/lib/chat-auth'
import {
  listBuyerThreadsForAdmin,
  listQuotesForAdmin,
  listSellerUsers,
} from '@/lib/chat-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  ensureEnvLoaded()
  const resolved = await resolveAdminChatContext(request)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const [threads, quotes, sellers] = await Promise.all([
    listBuyerThreadsForAdmin(100),
    listQuotesForAdmin({ status: 'pending_and_supplier', limit: 100 }),
    listSellerUsers(),
  ])

  return NextResponse.json({ threads, quotes, sellers })
}
