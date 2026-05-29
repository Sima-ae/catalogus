import { NextResponse } from 'next/server'
import { getDbErrorMessage } from '@/lib/db-errors'
import { listUsers } from '@/lib/users-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
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
