import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getAdminAnalyticsSummary } from '@/lib/admin-analytics-db'
import { getDbErrorMessage } from '@/lib/db-errors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const summary = await getAdminAnalyticsSummary()
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Admin analytics error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load analytics') },
      { status: 503 }
    )
  }
}
