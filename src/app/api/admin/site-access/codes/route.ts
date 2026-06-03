import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { countSiteAccessCodes } from '@/lib/site-access-codes-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Admin: pool statistics only (never lists individual codes). */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const stats = await countSiteAccessCodes()
    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Admin site access codes GET error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load access code stats') },
      { status: 503 }
    )
  }
}
