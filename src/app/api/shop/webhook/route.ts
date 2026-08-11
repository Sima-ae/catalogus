import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { markShopOrderCancelled, markShopOrderPaid } from '@/lib/shop-orders-db'
import { getStripe } from '@/lib/shop-stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || null

  await markShopOrderPaid({
    orderId: session.metadata?.orderId || null,
    stripeSessionId: session.id,
    paymentIntentId,
  })
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!secret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET missing' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  const rawBody = await request.text()
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch (error) {
    console.error('[shop/webhook] signature', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session
      await markShopOrderCancelled({
        orderId: session.metadata?.orderId || null,
        stripeSessionId: session.id,
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[shop/webhook]', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
