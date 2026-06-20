import { NextRequest, NextResponse } from 'next/server'
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { resolveSupplierChatViewer } from '@/lib/chat-auth'
import { listSupplierThreadsForSession } from '@/lib/chat-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  ensureEnvLoaded()
  const resolved = await resolveSupplierChatViewer(request)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const threads = await listSupplierThreadsForSession(resolved.viewer.session.id, 50)
  return NextResponse.json({ threads })
}
