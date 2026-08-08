import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { isRateLimitedIp } from '@/lib/bot-traffic'
import { clientIp } from '@/lib/request-client-ip'

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil',
  })
}

/** Max PaymentIntent amount in cents (€5,000) — blocks arbitrary client amounts. */
const MAX_PAYMENT_AMOUNT_CENTS = 500_000

export async function POST(request: NextRequest) {
  const ip = clientIp(request)
  if (isRateLimitedIp(`payment-intent:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many payment attempts' }, { status: 429 })
  }

  try {
    const body = await request.json().catch(() => null)
    const amount = Number(body?.amount)
    const itemCount = Array.isArray(body?.items) ? body.items.length : 0

    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_PAYMENT_AMOUNT_CENTS) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }
    if (itemCount <= 0 || itemCount > 100) {
      return NextResponse.json({ error: 'Invalid cart' }, { status: 400 })
    }

    // Checkout currently trusts a client amount — keep a hard cap + rate limit until
    // server-side cart pricing is wired. Do not echo full cart into Stripe metadata.
    const stripe = getStripe()
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      metadata: {
        item_count: String(itemCount),
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    })
  } catch (error) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
