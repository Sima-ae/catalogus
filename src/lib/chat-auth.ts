import type { NextRequest } from 'next/server'
import { getSiteAccessConfig } from '@/lib/site-access'
import { readUnlockCookie, verifyUnlockToken } from '@/lib/site-access-cookie'
import { tryVerifyCatalogActor, type CatalogActor } from '@/lib/catalog-user-auth'
import { resolvePricelistAccess } from '@/lib/pricelist-access'
import { verifySiteAccessCodeToken } from '@/lib/site-access-cookie'
import {
  readChatSessionCookie,
  readSiteAccessCodeCookie,
  verifyChatSessionToken,
} from '@/lib/chat-session-cookie'
import {
  createChatParticipantSession,
  getChatParticipantSessionById,
  type ChatParticipantSessionRow,
} from '@/lib/chat-db'

export type ChatViewerContext = {
  session: ChatParticipantSessionRow
  actor: CatalogActor | null
  siteAccessCodeId: string | null
  mode: 'site' | 'pricelist'
  pricelistOwnerId: string | null
}

async function ensureSiteUnlocked(request: NextRequest): Promise<{ ok: true; configVersion: number } | { ok: false; status: number; error: string }> {
  const config = await getSiteAccessConfig()
  if (!config.required) return { ok: true, configVersion: config.version }
  const token = readUnlockCookie(request.headers.get('cookie'))
  const allowed = await verifyUnlockToken(token, config.version)
  if (!allowed) return { ok: false, status: 401, error: 'Site access required' }
  return { ok: true, configVersion: config.version }
}

export async function resolveChatViewer(
  request: NextRequest,
  options?: { allowPricelistGuest?: boolean }
): Promise<{ ok: true; viewer: ChatViewerContext; configVersion: number } | { ok: false; status: number; error: string }> {
  const unlock = await ensureSiteUnlocked(request)
  if (!unlock.ok) return unlock

  const actor = await tryVerifyCatalogActor(request)

  let mode: ChatViewerContext['mode'] = 'site'
  let pricelistOwnerId: string | null = null

  if (options?.allowPricelistGuest) {
    const ownerParam = request.nextUrl.searchParams.get('owner')
    const pricelist = await resolvePricelistAccess(request, ownerParam)
    if (pricelist.ok && pricelist.mode === 'guest') {
      mode = 'pricelist'
      pricelistOwnerId = pricelist.ownerId
    }
  }

  const cookieHeader = request.headers.get('cookie')
  const codeToken = readSiteAccessCodeCookie(cookieHeader)
  const siteAccessCodeId = await verifySiteAccessCodeToken(codeToken, unlock.configVersion)

  const chatToken = readChatSessionCookie(cookieHeader)
  const sessionId = await verifyChatSessionToken(chatToken, unlock.configVersion)
  if (sessionId) {
    const existing = await getChatParticipantSessionById(sessionId)
    if (existing) {
      return {
        ok: true,
        viewer: { session: existing, actor, siteAccessCodeId, mode, pricelistOwnerId },
        configVersion: unlock.configVersion,
      }
    }
  }

  const session = await createChatParticipantSession({
    participantType: actor
      ? actor.role === 'admin'
        ? 'admin_user'
        : actor.role === 'buyer'
          ? 'buyer_user'
          : 'seller_user'
      : mode === 'pricelist'
        ? 'pricelist_guest'
        : siteAccessCodeId
          ? 'site_code'
          : 'site_password',
    siteAccessCodeId,
    userId: actor?.userId ?? null,
    pricelistOwnerId,
    displayLabel: siteAccessCodeId ? 'Access code' : null,
  })

  return {
    ok: true,
    viewer: { session, actor, siteAccessCodeId, mode, pricelistOwnerId },
    configVersion: unlock.configVersion,
  }
}

