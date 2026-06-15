import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { zeroDraftPurchasePrices } from '@/lib/zero-draft-purchase-prices'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const dryRun = request.nextUrl.searchParams.get('dryRun') === '1'

  try {
    const result = await zeroDraftPurchasePrices({ dryRun })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Zero draft purchase prices error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to zero draft purchase prices') },
      { status: 503 }
    )
  }
}
