import { NextRequest, NextResponse } from 'next/server'
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { resolveChatViewer } from '@/lib/chat-auth'
import { createChatSessionToken, CHAT_SESSION_COOKIE } from '@/lib/chat-session-cookie'
import {
  createBuyerConversation,
  findBuyerConversationForSession,
} from '@/lib/chat-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  ensureEnvLoaded()
  const resolved = await resolveChatViewer(request, { allowPricelistGuest: true })
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const { viewer, configVersion } = resolved

  // Default: visitors/buyers get a buyer thread. Sellers/pricelist guests use a separate inbox endpoint later.
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
    conversationId: conversation?.id ?? null,
    conversationType: conversation?.type ?? null,
    mode: viewer.mode,
    pricelistOwnerId: viewer.pricelistOwnerId,
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

