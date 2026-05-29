import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { listDraftImportProducts } from '@/lib/products-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const limit = Number(request.nextUrl.searchParams.get('limit') || '100')
    const products = await listDraftImportProducts(
      Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : 100
    )
    return NextResponse.json(products)
  } catch (error) {
    console.error('Import review fetch error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load import review queue') },
      { status: 503 }
    )
  }
}
