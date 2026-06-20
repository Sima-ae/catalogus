import type { NextRequest } from 'next/server'
import { getSiteAccessConfig } from '@/lib/site-access'
import { readUnlockCookie, verifyUnlockToken } from '@/lib/site-access-cookie'
import { canViewPricelist, tryVerifyCatalogActor, type CatalogActor } from '@/lib/catalog-user-auth'
import { resolvePricelistAccess } from '@/lib/pricelist-access'
import { verifySiteAccessCodeToken } from '@/lib/site-access-cookie'
import {
  readChatSessionCookie,
  readSiteAccessCodeCookie,
  verifyChatSessionToken,
} from '@/lib/chat-session-cookie'
import {
  createChatParticipantSession,
  findChatSessionBySiteAccessCode,
  findChatSessionByVisitorIp,
  findChatSessionForPricelistSupplier,
  findChatSessionForUser,
  findPricelistGuestSession,
  getChatParticipantSessionById,
  touchChatParticipantSessionLastSeen,
  type ChatParticipantSessionRow,
} from '@/lib/chat-db'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getPricelistPageById, resolvePricelistOwnerId } from '@/lib/pricelist-pages-db'
import { queryDb } from '@/lib/db'
import { clientIp } from '@/lib/request-client-ip'

export type ChatViewerContext = {
  session: ChatParticipantSessionRow
  actor: CatalogActor | null
  siteAccessCodeId: string | null
  mode: 'site' | 'pricelist'
  pricelistOwnerId: string | null
  pricelistLabel: string | null
  chatRole: 'buyer' | 'pricelist_supplier'
}

async function ensureSiteUnlocked(request: NextRequest): Promise<{ ok: true; configVersion: number } | { ok: false; status: number; error: string }> {
  const config = await getSiteAccessConfig()
  if (!config.required) return { ok: true, configVersion: config.version }
  const token = readUnlockCookie(request.headers.get('cookie'))
  const allowed = await verifyUnlockToken(token, config.version)
  if (!allowed) return { ok: false, status: 401, error: 'Site access required' }
  return { ok: true, configVersion: config.version }
}

async function findSiteAccessCodeById(id: string): Promise<{ code: string } | null> {
  try {
    const rows = await queryDb<{ code: string }[]>(
      'SELECT code FROM site_access_codes WHERE id = ? LIMIT 1',
      [id]
    )
    return rows[0] ?? null
  } catch {
    return null
  }
}

async function resolvePricelistLabel(ownerId: string | null): Promise<string | null> {
  if (!ownerId) return null
  const page = await getPricelistPageById(ownerId)
  return page?.label?.trim() || null
}

function isPricelistSupplierActor(
  actor: CatalogActor | null,
  pricelistOwnerId: string | null,
  pricelistAccess: Awaited<ReturnType<typeof resolvePricelistAccess>>
): boolean {
  if (!pricelistOwnerId) return false
  if (!pricelistAccess.ok) return false
  if (actor?.role === 'admin') return true
  if (actor?.role === 'seller' && pricelistAccess.mode === 'full') return true
  if (pricelistAccess.mode === 'guest') return true
  return false
}

function buyerSessionMatchesContext(
  session: ChatParticipantSessionRow,
  ctx: { actor: CatalogActor | null; siteAccessCodeId: string | null }
): boolean {
  if (ctx.actor && ctx.actor.role !== 'admin' && ctx.actor.role !== 'seller') {
    return session.participant_type === 'buyer_user' && session.user_id === ctx.actor.userId
  }
  if (ctx.siteAccessCodeId) {
    return (
      session.participant_type === 'site_code' &&
      session.site_access_code_id === ctx.siteAccessCodeId
    )
  }
  return session.participant_type === 'site_password'
}

async function resolveBuyerChatSession(input: {
  request: NextRequest
  actor: CatalogActor | null
  siteAccessCodeId: string | null
  configVersion: number
}): Promise<ChatParticipantSessionRow> {
  const { request, actor, siteAccessCodeId, configVersion } = input
  const visitorIp = clientIp(request)
  const chatToken = readChatSessionCookie(request.headers.get('cookie'))
  const cookieSessionId = await verifyChatSessionToken(chatToken, configVersion)

  if (actor && actor.role !== 'admin' && actor.role !== 'seller') {
    const existingUserSession = await findChatSessionForUser(actor.userId, 'buyer_user')
    if (existingUserSession) {
      await touchChatParticipantSessionLastSeen(existingUserSession.id)
      return existingUserSession
    }
  }

  if (siteAccessCodeId && !actor) {
    const existingCodeSession = await findChatSessionBySiteAccessCode(siteAccessCodeId)
    if (existingCodeSession) {
      const codeRow = await findSiteAccessCodeById(siteAccessCodeId)
      const label = codeRow?.code ?? existingCodeSession.display_label
      if (label && existingCodeSession.display_label !== label) {
        await queryDb(`UPDATE chat_participant_sessions SET display_label = ? WHERE id = ?`, [
          label,
          existingCodeSession.id,
        ])
        existingCodeSession.display_label = label
      }
      await touchChatParticipantSessionLastSeen(existingCodeSession.id)
      return existingCodeSession
    }
  }

  if (cookieSessionId) {
    const cookieSession = await getChatParticipantSessionById(cookieSessionId)
    if (
      cookieSession &&
      buyerSessionMatchesContext(cookieSession, { actor, siteAccessCodeId })
    ) {
      await touchChatParticipantSessionLastSeen(cookieSession.id)
      return cookieSession
    }
  }

  if (!siteAccessCodeId && !actor) {
    const ipSession = await findChatSessionByVisitorIp(visitorIp)
    if (ipSession) {
      await touchChatParticipantSessionLastSeen(ipSession.id)
      return ipSession
    }
  }

  let displayLabel: string | null = null
  if (siteAccessCodeId) {
    const codeRow = await findSiteAccessCodeById(siteAccessCodeId)
    displayLabel = codeRow?.code ?? null
  }

  const participantType = actor
    ? actor.role === 'admin'
      ? 'admin_user'
      : actor.role === 'buyer'
        ? 'buyer_user'
        : actor.role === 'seller'
          ? 'seller_user'
          : 'site_password'
    : siteAccessCodeId
      ? 'site_code'
      : 'site_password'

  return createChatParticipantSession({
    participantType,
    siteAccessCodeId,
    userId: actor?.userId ?? null,
    pricelistOwnerId: null,
    displayLabel: participantType === 'site_code' ? displayLabel : null,
    visitorIp: participantType === 'site_password' ? visitorIp : null,
  })
}

export async function resolveChatViewer(
  request: NextRequest,
  options?: { allowPricelistGuest?: boolean; ownerParam?: string | null }
): Promise<{ ok: true; viewer: ChatViewerContext; configVersion: number } | { ok: false; status: number; error: string }> {
  const unlock = await ensureSiteUnlocked(request)
  if (!unlock.ok) return unlock

  const actor = await tryVerifyCatalogActor(request)
  const ownerParam =
    options?.ownerParam?.trim() ||
    request.nextUrl.searchParams.get('owner')?.trim() ||
    null

  let mode: ChatViewerContext['mode'] = 'site'
  let pricelistOwnerId: string | null = null
  let pricelistLabel: string | null = null
  let pricelistAccess: Awaited<ReturnType<typeof resolvePricelistAccess>> = {
    ok: false,
    status: 401,
    error: 'No pricelist',
  }

  if (options?.allowPricelistGuest && ownerParam) {
    pricelistAccess = await resolvePricelistAccess(request, ownerParam)
    if (pricelistAccess.ok) {
      mode = 'pricelist'
      pricelistOwnerId = pricelistAccess.ownerId
      pricelistLabel = await resolvePricelistLabel(pricelistOwnerId)
    }
  }

  const onPricelistSupplier = isPricelistSupplierActor(actor, pricelistOwnerId, pricelistAccess)
  const chatRole: ChatViewerContext['chatRole'] = onPricelistSupplier ? 'pricelist_supplier' : 'buyer'

  const cookieHeader = request.headers.get('cookie')
  const codeToken = readSiteAccessCodeCookie(cookieHeader)
  const siteAccessCodeId = await verifySiteAccessCodeToken(codeToken, unlock.configVersion)

  const chatToken = readChatSessionCookie(cookieHeader)
  const sessionId = await verifyChatSessionToken(chatToken, unlock.configVersion)
  if (sessionId) {
    const existing = await getChatParticipantSessionById(sessionId)
    if (existing) {
      if (onPricelistSupplier && pricelistOwnerId && pricelistLabel) {
        const matchesPricelist =
          existing.pricelist_owner_id === pricelistOwnerId &&
          (existing.participant_type === 'pricelist_guest' ||
            existing.participant_type === 'seller_user' ||
            existing.participant_type === 'admin_user')
        if (!matchesPricelist) {
          // fall through to create pricelist-scoped session
        } else {
          if (existing.display_label !== pricelistLabel) {
            await queryDb(`UPDATE chat_participant_sessions SET display_label = ? WHERE id = ?`, [
              pricelistLabel,
              existing.id,
            ])
            existing.display_label = pricelistLabel
          }
          await touchChatParticipantSessionLastSeen(existing.id)
          return {
            ok: true,
            viewer: {
              session: existing,
              actor,
              siteAccessCodeId,
              mode,
              pricelistOwnerId,
              pricelistLabel,
              chatRole,
            },
            configVersion: unlock.configVersion,
          }
        }
      }
    }
  }

  if (onPricelistSupplier && pricelistOwnerId && pricelistLabel) {
    const participantType =
      actor?.role === 'admin'
        ? 'admin_user'
        : actor?.role === 'seller'
          ? 'seller_user'
          : 'pricelist_guest'

    let existing =
      participantType === 'pricelist_guest'
        ? await findPricelistGuestSession(pricelistOwnerId)
        : actor
          ? await findChatSessionForPricelistSupplier({
              userId: actor.userId,
              pricelistOwnerId,
              participantType: 'seller_user',
            })
          : null

    if (existing) {
      if (existing.display_label !== pricelistLabel) {
        await queryDb(`UPDATE chat_participant_sessions SET display_label = ? WHERE id = ?`, [
          pricelistLabel,
          existing.id,
        ])
        existing = (await getChatParticipantSessionById(existing.id))!
      }
      await touchChatParticipantSessionLastSeen(existing.id)
      return {
        ok: true,
        viewer: {
          session: existing,
          actor,
          siteAccessCodeId,
          mode,
          pricelistOwnerId,
          pricelistLabel,
          chatRole,
        },
        configVersion: unlock.configVersion,
      }
    }

    const session = await createChatParticipantSession({
      participantType,
      siteAccessCodeId: null,
      userId: actor?.userId ?? null,
      pricelistOwnerId,
      displayLabel: pricelistLabel,
    })
    return {
      ok: true,
      viewer: {
        session,
        actor,
        siteAccessCodeId,
        mode,
        pricelistOwnerId,
        pricelistLabel,
        chatRole,
      },
      configVersion: unlock.configVersion,
    }
  }

  const session = await resolveBuyerChatSession({
    request,
    actor,
    siteAccessCodeId,
    configVersion: unlock.configVersion,
  })

  return {
    ok: true,
    viewer: {
      session,
      actor,
      siteAccessCodeId,
      mode,
      pricelistOwnerId,
      pricelistLabel,
      chatRole: 'buyer',
    },
    configVersion: unlock.configVersion,
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
  pricelistOwnerId: string
  pricelistLabel: string | null
}

export async function resolveSupplierChatViewer(
  request: NextRequest
): Promise<{ ok: true; viewer: SupplierChatContext } | { ok: false; status: number; error: string }> {
  const unlock = await ensureSiteUnlocked(request)
  if (!unlock.ok) return unlock

  const ownerParam = request.nextUrl.searchParams.get('owner')
  const ownerId = await resolvePricelistOwnerId(ownerParam)
  if (!ownerId) {
    return { ok: false, status: 400, error: 'Pricelist owner is required' }
  }

  const pricelistLabel = await resolvePricelistLabel(ownerId)
  const actor = await tryVerifyCatalogActor(request)
  const pricelistAccess = await resolvePricelistAccess(request, ownerParam)

  if (!isPricelistSupplierActor(actor, ownerId, pricelistAccess)) {
    return { ok: false, status: 403, error: 'Supplier chat access required' }
  }

  const chatToken = readChatSessionCookie(request.headers.get('cookie'))
  const cookieSessionId = await verifyChatSessionToken(chatToken, unlock.configVersion)
  if (cookieSessionId) {
    const cookieSession = await getChatParticipantSessionById(cookieSessionId)
    if (
      cookieSession &&
      cookieSession.pricelist_owner_id === ownerId &&
      (cookieSession.participant_type === 'pricelist_guest' ||
        cookieSession.participant_type === 'seller_user' ||
        cookieSession.participant_type === 'admin_user')
    ) {
      if (pricelistLabel && cookieSession.display_label !== pricelistLabel) {
        await queryDb(`UPDATE chat_participant_sessions SET display_label = ? WHERE id = ?`, [
          pricelistLabel,
          cookieSession.id,
        ])
        cookieSession.display_label = pricelistLabel
      }
      await touchChatParticipantSessionLastSeen(cookieSession.id)
      return {
        ok: true,
        viewer: { session: cookieSession, actor, pricelistOwnerId: ownerId, pricelistLabel },
      }
    }
  }

  const participantType =
    actor?.role === 'admin'
      ? 'admin_user'
      : actor?.role === 'seller'
        ? 'seller_user'
        : 'pricelist_guest'

  let session =
    participantType === 'pricelist_guest'
      ? await findPricelistGuestSession(ownerId)
      : actor
        ? await findChatSessionForPricelistSupplier({
            userId: actor.userId,
            pricelistOwnerId: ownerId,
            participantType: 'seller_user',
          })
        : null

  if (!session) {
    session = await createChatParticipantSession({
      participantType,
      userId: actor?.userId ?? null,
      pricelistOwnerId: ownerId,
      displayLabel: pricelistLabel,
    })
  } else if (pricelistLabel && session.display_label !== pricelistLabel) {
    await queryDb(`UPDATE chat_participant_sessions SET display_label = ? WHERE id = ?`, [
      pricelistLabel,
      session.id,
    ])
    session = (await getChatParticipantSessionById(session.id))!
  }

  await touchChatParticipantSessionLastSeen(session.id)
  return {
    ok: true,
    viewer: { session, actor, pricelistOwnerId: ownerId, pricelistLabel },
  }
}

export async function canActorAccessPricelistSupplierChat(
  actor: CatalogActor | null,
  request: NextRequest,
  pricelistOwnerId: string
): Promise<boolean> {
  if (!pricelistOwnerId) return false
  if (actor?.role === 'admin') return true
  if (actor && (await canViewPricelist(actor, pricelistOwnerId))) return true
  const access = await resolvePricelistAccess(request, pricelistOwnerId)
  return access.ok && access.mode === 'guest'
}
