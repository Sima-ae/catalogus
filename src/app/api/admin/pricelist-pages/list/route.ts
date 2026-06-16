import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { listPricelistPages } from '@/lib/pricelist-pages-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Lightweight list of active supplier pricelist pages for admin selectors. */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const pages = await listPricelistPages({ activeOnly: true })
    return NextResponse.json(
      pages.map((p) => ({
        id: p.id,
        slug: p.slug,
        label: p.label,
      }))
    )
  } catch (error) {
    console.error('Admin pricelist pages list GET:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load pricelist pages') },
      { status: 503 }
    )
  }
}
