import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { buildImportWorkerCommand } from '@/lib/admin-import'
import { getDbErrorMessage } from '@/lib/db-errors'
import {
  countRefreshableJobItems,
  findLatestImportJobForSource,
  getImportSource,
  queueRefreshAllImport,
} from '@/lib/import-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Re-queue all imported/skipped albums and refresh product data from Yupoo (--refresh --retry-all). */
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

    const job = await findLatestImportJobForSource(params.id)
    if (!job) {
      return NextResponse.json(
        { error: 'No import job yet. Run Start sync first, then refresh after the worker finishes.' },
        { status: 400 }
      )
    }

    const refreshCount = await countRefreshableJobItems(job.id)
    if (refreshCount === 0) {
      return NextResponse.json(
        { error: 'Nothing to refresh on the latest job. Run Start sync to import albums first.' },
        { status: 400 }
      )
    }

    await queueRefreshAllImport(job.id)
    const updated = { ...job, status: 'queued' as const }

    return NextResponse.json(
      {
        kind: 'refresh-all' as const,
        job: updated,
        refreshCount,
        workerCommand: buildImportWorkerCommand(job.id, ['--refresh', '--retry-all']),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Import refresh-all error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to queue refresh for all albums') },
      { status: 503 }
    )
  }
}
