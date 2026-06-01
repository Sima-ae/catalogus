import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { listUsers } from '@/lib/users-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const rows = await listUsers()
    return NextResponse.json(rows)
  } catch (error) {
    console.error('Users fetch error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load users') },
      { status: 503 }
    )
  }
}
