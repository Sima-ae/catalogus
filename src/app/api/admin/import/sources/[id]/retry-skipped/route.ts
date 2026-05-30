import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { buildImportWorkerCommand } from '@/lib/admin-import'
import { getDbErrorMessage } from '@/lib/db-errors'
import {
  countSkippedJobItems,
  findImportJobWithSkippedItems,
  getImportSource,
  queueRetrySkippedImport,
} from '@/lib/import-db'

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

    const job = await findImportJobWithSkippedItems(params.id)
    if (!job) {
      return NextResponse.json(
        { error: 'No skipped albums found. Run Start sync first, then retry after the worker finishes.' },
        { status: 400 }
      )
    }

    const skippedCount = await countSkippedJobItems(job.id)
    if (skippedCount === 0) {
      return NextResponse.json(
        { error: 'No skipped albums left on the latest job. Start sync to import new albums.' },
        { status: 400 }
      )
    }

    await queueRetrySkippedImport(job.id)
    const updated = { ...job, status: 'queued' as const }

    return NextResponse.json(
      {
        kind: 'retry-skipped' as const,
        job: updated,
        skippedCount,
        workerCommand: buildImportWorkerCommand(job.id, ['--refresh', '--retry-skipped']),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Import retry-skipped error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to queue retry for skipped albums') },
      { status: 503 }
    )
  }
}
