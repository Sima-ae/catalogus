import { NextRequest, NextResponse } from 'next/server'
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { resolveAdminChatContext } from '@/lib/chat-auth'
import { listPricelistPages, getProductCuratedPricelistId } from '@/lib/pricelist-pages-db'
import {
  listBuyerThreadsForAdmin,
  listQuotesForAdmin,
} from '@/lib/chat-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  ensureEnvLoaded()
  const resolved = await resolveAdminChatContext(request)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const [threads, quotes, pricelistPages] = await Promise.all([
    listBuyerThreadsForAdmin(100),
    listQuotesForAdmin({ status: 'pending_and_supplier', limit: 100 }),
    listPricelistPages({ activeOnly: true }),
  ])

  const quotesWithDefaults = await Promise.all(
    quotes.map(async (q) => ({
      ...q,
      suggestedPricelistPageId: q.product_id
        ? await getProductCuratedPricelistId(q.product_id)
        : null,
    }))
  )

  return NextResponse.json({
    threads,
    quotes: quotesWithDefaults,
    pricelistPages: pricelistPages.map((p) => ({
      id: p.id,
      slug: p.slug,
      label: p.label,
    })),
  })
}
