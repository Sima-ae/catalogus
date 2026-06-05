import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { emptyProductTrash } from '@/lib/products-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const deleted = await emptyProductTrash()
    return NextResponse.json({ deleted })
  } catch (error) {
    console.error('Empty trash error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to empty trash') },
      { status: 503 }
    )
  }
}
