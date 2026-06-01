import { NextRequest, NextResponse } from 'next/server'
import { tryVerifyCatalogActor } from '@/lib/catalog-user-auth'
import { isPricelistOwner } from '@/lib/catalog-user-auth'
import { resolvePricelistAccess, resolveOwnerIdFromParam } from '@/lib/pricelist-access'
import { getPricelistShareSettings } from '@/lib/pricelist-share-db'
import { parsePricelistOwnerParam } from '@/lib/pricelist-constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const ownerParam = request.nextUrl.searchParams.get('owner')
  const actor = await tryVerifyCatalogActor(request)

  let ownerId: string
  try {
    ownerId = resolveOwnerIdFromParam(ownerParam, actor)
  } catch {
    const parsed = parsePricelistOwnerParam(ownerParam)
    if (!parsed) {
      return NextResponse.json({
        allowed: false,
        requiresLogin: true,
        requiresPassword: false,
        hasPassword: false,
        loggedIn: Boolean(actor),
      })
    }
    ownerId = parsed
  }

  const settings = await getPricelistShareSettings(ownerId)
  const access = await resolvePricelistAccess(request, ownerParam)

  if (access.ok) {
    return NextResponse.json({
      allowed: true,
      ownerId: access.ownerId,
      mode: access.mode,
      loggedIn: Boolean(actor),
      hasPassword: settings.has_password,
      canManagePassword: actor ? isPricelistOwner(actor, ownerId) : false,
    })
  }

  return NextResponse.json({
    allowed: false,
    ownerId,
    loggedIn: Boolean(actor),
    hasPassword: settings.has_password,
    requiresLogin: access.requiresLogin ?? false,
    requiresPassword: access.requiresPassword ?? false,
    error: access.error,
  })
}
