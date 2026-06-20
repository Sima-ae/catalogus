import { NextRequest, NextResponse } from 'next/server'
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { resolveSupplierChatViewer } from '@/lib/chat-auth'
import { tryVerifyCatalogActor } from '@/lib/catalog-user-auth'
import { getViewablePricelistOwnersForSeller } from '@/lib/pricelist-db'
import {
  listSupplierThreadsForPricelist,
} from '@/lib/chat-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  ensureEnvLoaded()
  const ownerParam = request.nextUrl.searchParams.get('owner')
  if (ownerParam) {
    const resolved = await resolveSupplierChatViewer(request)
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status })
    }
    const threads = await listSupplierThreadsForPricelist(resolved.viewer.pricelistOwnerId, 50)
    return NextResponse.json({
      threads,
      pricelistOwnerId: resolved.viewer.pricelistOwnerId,
      pricelistLabel: resolved.viewer.pricelistLabel,
      displayLabel: resolved.viewer.session.display_label,
    })
  }

  const actor = await tryVerifyCatalogActor(request)
  if (!actor || actor.role !== 'seller') {
    return NextResponse.json({ error: 'Pricelist owner is required' }, { status: 400 })
  }

  const owners = await getViewablePricelistOwnersForSeller(actor.userId)
  const curated = owners.filter((o) => o.kind === 'platform')
  const threads = (
    await Promise.all(
      curated.map(async (o) => {
        const items = await listSupplierThreadsForPricelist(o.id, 50)
        return items.map((t) => ({ ...t, pricelistLabel: o.label, pricelistOwnerId: o.id }))
      })
    )
  ).flat()

  threads.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))

  return NextResponse.json({
    threads,
    pricelistOwnerId: null,
    pricelistLabel: null,
    displayLabel: null,
  })
}
