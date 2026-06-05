import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { saveCatalogProductOrder } from '@/lib/catalog-positions-db'
import { getDbErrorMessage } from '@/lib/db-errors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = (await request.json()) as {
      scope?: unknown
      productIds?: unknown
      page?: unknown
      pageSize?: unknown
    }

    const scope = typeof body.scope === 'string' ? body.scope.trim() : ''
    const productIds = Array.isArray(body.productIds)
      ? body.productIds.map(String).filter(Boolean)
      : []
    const page = Math.max(1, parseInt(String(body.page ?? 1), 10) || 1)
    const pageSize = Math.min(120, Math.max(1, parseInt(String(body.pageSize ?? 60), 10) || 60))

    if (!scope) {
      return NextResponse.json({ error: 'scope is required' }, { status: 400 })
    }
    if (!productIds.length) {
      return NextResponse.json({ error: 'productIds array is required' }, { status: 400 })
    }

    await saveCatalogProductOrder(scope, productIds, page, pageSize)
    return NextResponse.json({ ok: true, scope, count: productIds.length })
  } catch (error) {
    console.error('Catalog reorder error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to save product order') },
      { status: 503 }
    )
  }
}
