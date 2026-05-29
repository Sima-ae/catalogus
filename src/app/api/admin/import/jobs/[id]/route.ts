import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { getImportJob } from '@/lib/import-db'
import { queryDb } from '@/lib/db'
import type { ImportJobItemRow } from '@/lib/import-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const job = await getImportJob(params.id)
    if (!job) {
      return NextResponse.json({ error: 'Import job not found' }, { status: 404 })
    }

    const items = await queryDb<ImportJobItemRow[]>(
      `SELECT * FROM import_job_items WHERE job_id = ? ORDER BY created_at ASC LIMIT 200`,
      [params.id]
    )

    return NextResponse.json({ job, items })
  } catch (error) {
    console.error('Import job fetch error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load import job') },
      { status: 503 }
    )
  }
}
