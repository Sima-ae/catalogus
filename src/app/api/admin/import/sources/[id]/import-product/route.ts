import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { buildImportWorkerCommand } from '@/lib/admin-import'
import { getDbErrorMessage } from '@/lib/db-errors'
import {
  createSingleWooProductImportJob,
  getImportSource,
  isWooCommerceImportSource,
} from '@/lib/import-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { id: string } }

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const source = await getImportSource(params.id)
    if (!source) {
      return NextResponse.json({ error: 'Import source not found' }, { status: 404 })
    }

    if (!isWooCommerceImportSource(source)) {
      return NextResponse.json(
        { error: 'Single product URL import is only available for WooCommerce sources' },
        { status: 400 }
      )
    }

    if (!source.catalog_category_id) {
      return NextResponse.json(
        { error: 'Import source must have a catalog category' },
        { status: 400 }
      )
    }

    const body = (await request.json().catch(() => null)) as { productUrl?: string } | null
    const productUrl = String(body?.productUrl ?? '').trim()
    if (!productUrl) {
      return NextResponse.json({ error: 'Product URL is required' }, { status: 400 })
    }

    const job = await createSingleWooProductImportJob(source, productUrl)

    return NextResponse.json(
      {
        kind: 'import-product' as const,
        job,
        productUrl,
        workerCommand: buildImportWorkerCommand(job.id, ['--refresh']),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Import single product error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to queue product import') },
      { status: 503 }
    )
  }
}
