import { NextRequest, NextResponse } from 'next/server'
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { resolveChatViewer } from '@/lib/chat-auth'
import { createChatSessionToken, CHAT_SESSION_COOKIE } from '@/lib/chat-session-cookie'
import {
  createBuyerConversation,
  findBuyerConversationForSession,
  listSupplierThreadsForPricelist,
} from '@/lib/chat-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  ensureEnvLoaded()
  const ownerParam = request.nextUrl.searchParams.get('owner')
  const resolved = await resolveChatViewer(request, {
    allowPricelistGuest: true,
    ownerParam,
  })
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const { viewer, configVersion } = resolved

  if (viewer.chatRole === 'pricelist_supplier' && viewer.pricelistOwnerId) {
    const threads = await listSupplierThreadsForPricelist(viewer.pricelistOwnerId, 50)
    const token = await createChatSessionToken(configVersion, viewer.session.id)
    const res = NextResponse.json({
      sessionId: viewer.session.id,
      participantType: viewer.session.participant_type,
      chatRole: 'pricelist_supplier',
      displayLabel: viewer.pricelistLabel ?? viewer.session.display_label,
      conversationId: null,
      conversationType: null,
      mode: viewer.mode,
      pricelistOwnerId: viewer.pricelistOwnerId,
      supplierThreads: threads,
      selectedThreadId: threads[0]?.id ?? null,
    })
    if (token) {
      res.cookies.set(CHAT_SESSION_COOKIE, token.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: token.maxAge,
      })
    }
    return res
  }

  const allowBuyerThread =
    viewer.session.participant_type === 'site_password' ||
    viewer.session.participant_type === 'site_code' ||
    viewer.session.participant_type === 'buyer_user'

  const conversation = allowBuyerThread
    ? (await findBuyerConversationForSession(viewer.session.id)) ??
      (await createBuyerConversation({ buyerSessionId: viewer.session.id }))
    : null

  const token = await createChatSessionToken(configVersion, viewer.session.id)
  const res = NextResponse.json({
    sessionId: viewer.session.id,
    participantType: viewer.session.participant_type,
    chatRole: 'buyer',
    displayLabel: viewer.session.display_label,
    conversationId: conversation?.id ?? null,
    conversationType: conversation?.type ?? null,
    mode: viewer.mode,
    pricelistOwnerId: viewer.pricelistOwnerId,
    supplierThreads: [],
    selectedThreadId: null,
  })

  if (token) {
    res.cookies.set(CHAT_SESSION_COOKIE, token.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: token.maxAge,
    })
  }

  return res
}
