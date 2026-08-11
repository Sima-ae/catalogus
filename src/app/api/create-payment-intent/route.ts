import { NextResponse } from 'next/server'

/**
 * Deprecated: client-supplied PaymentIntent amounts are unsafe.
 * Use POST /api/shop/checkout (Stripe Checkout Session + server prices).
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        'This endpoint is deprecated. Use POST /api/shop/checkout for server-priced Stripe Checkout.',
    },
    { status: 410 }
  )
}
