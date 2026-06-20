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
  findChatSessionForUser,
  findPricelistGuestSession,
  getChatParticipantSessionById,
  touchChatParticipantSessionLastSeen,
  type ChatParticipantSessionRow,
} from '@/lib/chat-db'
import { verifyAdminActor } from '@/lib/admin-api-auth'

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
      await touchChatParticipantSessionLastSeen(existing.id)
      return {
        ok: true,
        viewer: { session: existing, actor, siteAccessCodeId, mode, pricelistOwnerId },
        configVersion: unlock.configVersion,
      }
    }
  }

  if (actor) {
    const participantType =
      actor.role === 'admin' ? 'admin_user' : actor.role === 'buyer' ? 'buyer_user' : 'seller_user'
    const existingUserSession = await findChatSessionForUser(actor.userId, participantType)
    if (existingUserSession) {
      await touchChatParticipantSessionLastSeen(existingUserSession.id)
      return {
        ok: true,
        viewer: {
          session: existingUserSession,
          actor,
          siteAccessCodeId,
          mode,
          pricelistOwnerId,
        },
        configVersion: unlock.configVersion,
      }
    }
  }

  if (mode === 'pricelist' && pricelistOwnerId) {
    const existingGuest = await findPricelistGuestSession(pricelistOwnerId)
    if (existingGuest) {
      await touchChatParticipantSessionLastSeen(existingGuest.id)
      return {
        ok: true,
        viewer: { session: existingGuest, actor, siteAccessCodeId, mode, pricelistOwnerId },
        configVersion: unlock.configVersion,
      }
    }
  }

  let displayLabel: string | null = null
  if (siteAccessCodeId) {
    const codeRow = await findSiteAccessCodeById(siteAccessCodeId)
    displayLabel = codeRow ? `Code ${codeRow.code}` : 'Access code'
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
    displayLabel,
  })

  return {
    ok: true,
    viewer: { session, actor, siteAccessCodeId, mode, pricelistOwnerId },
    configVersion: unlock.configVersion,
  }
}

async function findSiteAccessCodeById(id: string): Promise<{ code: string } | null> {
  try {
    const { queryDb } = await import('@/lib/db')
    const rows = await queryDb<{ code: string }[]>(
      'SELECT code FROM site_access_codes WHERE id = ? LIMIT 1',
      [id]
    )
    return rows[0] ?? null
  } catch {
    return null
  }
}

export type AdminChatContext = {
  actor: { userId: string; email: string; isSuperAdmin: boolean }
  session: ChatParticipantSessionRow
}

export async function resolveAdminChatContext(
  request: NextRequest
): Promise<{ ok: true; ctx: AdminChatContext } | { ok: false; status: number; error: string }> {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) return auth

  let session = await findChatSessionForUser(auth.actor.userId, 'admin_user')
  if (!session) {
    session = await createChatParticipantSession({
      participantType: 'admin_user',
      userId: auth.actor.userId,
      displayLabel: auth.actor.email,
    })
  }
  await touchChatParticipantSessionLastSeen(session.id)

  return { ok: true, ctx: { actor: auth.actor, session } }
}

export type SupplierChatContext = {
  session: ChatParticipantSessionRow
  actor: CatalogActor | null
  pricelistOwnerId: string | null
}

export async function resolveSupplierChatViewer(
  request: NextRequest
): Promise<{ ok: true; viewer: SupplierChatContext } | { ok: false; status: number; error: string }> {
  const actor = await tryVerifyCatalogActor(request)

  if (actor?.role === 'seller') {
    let session = await findChatSessionForUser(actor.userId, 'seller_user')
    if (!session) {
      session = await createChatParticipantSession({
        participantType: 'seller_user',
        userId: actor.userId,
        displayLabel: actor.email,
      })
    }
    await touchChatParticipantSessionLastSeen(session.id)
    return { ok: true, viewer: { session, actor, pricelistOwnerId: null } }
  }

  const unlock = await ensureSiteUnlocked(request)
  if (!unlock.ok) return unlock

  const ownerParam = request.nextUrl.searchParams.get('owner')
  const pricelist = await resolvePricelistAccess(request, ownerParam)
  if (!pricelist.ok || pricelist.mode !== 'guest') {
    return { ok: false, status: 403, error: 'Supplier chat access required' }
  }

  let session = await findPricelistGuestSession(pricelist.ownerId)
  if (!session) {
    session = await createChatParticipantSession({
      participantType: 'pricelist_guest',
      pricelistOwnerId: pricelist.ownerId,
      displayLabel: 'Pricelist guest',
    })
  }
  await touchChatParticipantSessionLastSeen(session.id)
  return {
    ok: true,
    viewer: { session, actor: pricelist.actor, pricelistOwnerId: pricelist.ownerId },
  }
}

