import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import {
  countSiteAccessCodes,
  pickRandomAvailableSiteAccessCode,
} from '@/lib/site-access-codes-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Admin: pick one random unassigned code (does not expose the full pool). */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const code = await pickRandomAvailableSiteAccessCode()
    if (!code) {
      const stats = await countSiteAccessCodes()
      if (stats.total === 0) {
        return NextResponse.json(
          { error: 'No access codes in the pool. Seed codes first.' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'No free access codes left in the pool.' },
        { status: 404 }
      )
    }

    const stats = await countSiteAccessCodes()
    return NextResponse.json({ code, stats })
  } catch (error) {
    console.error('Admin random site access code error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to pick a random access code') },
      { status: 503 }
    )
  }
}
