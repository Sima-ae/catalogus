import { NextRequest, NextResponse } from 'next/server'
import { verifyCatalogActor, defaultPricelistOwnerForActor } from '@/lib/catalog-user-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { getViewablePricelistOwnersForSeller } from '@/lib/pricelist-db'
import {
  ensurePricelistPagesCache,
  listPricelistPages,
  ownerIdToSlug,
} from '@/lib/pricelist-pages-db'
import {
  PLATFORM_PRICELIST_OWNER_ID,
  PRICELIST_OWNER_QUERY_PLATFORM,
} from '@/lib/pricelist-constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await verifyCatalogActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    await ensurePricelistPagesCache()
    const defaultOwnerId = defaultPricelistOwnerForActor(auth.actor)

    if (auth.actor.role === 'seller') {
      const owners = await getViewablePricelistOwnersForSeller(auth.actor.userId)
      return NextResponse.json({
        defaultOwnerId,
        owners: owners.map((o) => ({
          id: o.kind === 'platform' ? ownerIdToSlug(o.id) : o.id,
          label: o.label,
          kind: o.kind,
        })),
      })
    }

    if (auth.actor.role === 'admin') {
      const pages = await listPricelistPages({ activeOnly: true })
      return NextResponse.json({
        defaultOwnerId: PLATFORM_PRICELIST_OWNER_ID,
        owners: pages.map((p) => ({
          id: p.slug,
          label: p.label,
          kind: 'platform' as const,
        })),
      })
    }

    return NextResponse.json({
      defaultOwnerId,
      owners: [{ id: auth.actor.userId, label: 'My pricelist', kind: 'self' }],
    })
  } catch (error) {
    console.error('Pricelist owners GET:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load pricelist owners') },
      { status: 503 }
    )
  }
}
