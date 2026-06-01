import { NextResponse } from 'next/server'
import { isProductCardDetailsEnabled } from '@/lib/product-card-display'
import { getDbErrorMessage } from '@/lib/db-errors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Public read: whether product cards show price and short description. */
export async function GET() {
  try {
    const showCardDetails = await isProductCardDetailsEnabled()
    return NextResponse.json({ showCardDetails })
  } catch (error) {
    console.error('Product card display GET error:', error)
    return NextResponse.json(
      {
        error: getDbErrorMessage(error, 'Failed to load product card display'),
        showCardDetails: true,
      },
      { status: 503 }
    )
  }
}
