import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { createImportJob, getImportSource } from '@/lib/import-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const source = await getImportSource(params.id)
    if (!source) {
      return NextResponse.json({ error: 'Import source not found' }, { status: 404 })
    }

    if (!source.catalog_category_id) {
      return NextResponse.json(
        { error: 'Import source must have a catalog category' },
        { status: 400 }
      )
    }

    const job = await createImportJob(params.id)
    return NextResponse.json(
      {
        job,
        workerCommand: `npm run import:worker -- --job=${job.id}`,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Import sync error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to start import job') },
      { status: 503 }
    )
  }
}
