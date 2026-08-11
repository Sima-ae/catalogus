import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { isRateLimitedIp } from '@/lib/bot-traffic'
import { clientIp } from '@/lib/request-client-ip'
import { appPath } from '@/lib/paths'
import { eurosToStripeCents } from '@/lib/shop-commerce'
import {
  createPendingShopOrder,
  resolveCheckoutLines,
  setOrderStripeSessionId,
} from '@/lib/shop-orders-db'
import { getStripe, isStripeConfigured } from '@/lib/shop-stripe'
import { resolveRequestOrigin, resolveStoreModeFromHeaders } from '@/lib/store-host'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CheckoutBody = {
  items?: { productId?: string; quantity?: number }[]
  customer?: { name?: string; email?: string; phone?: string }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request)
  if (isRateLimitedIp(`shop-checkout:${ip}`, 12, 60_000)) {
    return NextResponse.json({ error: 'Too many checkout attempts' }, { status: 429 })
  }

  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe is not configured (STRIPE_SECRET_KEY).' },
        { status: 503 }
      )
    }

    const body = (await request.json().catch(() => null)) as CheckoutBody | null
    const name = String(body?.customer?.name ?? '').trim()
    const email = String(body?.customer?.email ?? '').trim().toLowerCase()
    const phone = String(body?.customer?.phone ?? '').trim() || undefined
    const rawItems = Array.isArray(body?.items) ? body!.items! : []

    if (name.length < 2 || name.length > 120) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!isValidEmail(email) || email.length > 190) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const items = rawItems.map((item) => ({
      productId: String(item?.productId ?? '').trim(),
      quantity: Math.floor(Number(item?.quantity)),
    }))

    const storeMode = resolveStoreModeFromHeaders(request.headers)
    const resolved = await resolveCheckoutLines(items, storeMode)
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status })
    }

    const order = await createPendingShopOrder({
      customer: { name, email, phone },
      lines: resolved.lines,
      subtotal: resolved.subtotal,
      storeMode,
    })

    const origin = resolveRequestOrigin(request.headers)
    const successUrl = `${origin}${appPath('/checkout/success')}?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${origin}${appPath('/checkout')}?canceled=1`

    const stripe = getStripe()
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      customer_email: email,
      client_reference_id: order.orderId,
      metadata: {
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        storeMode,
      },
      payment_method_types: ['card', 'ideal', 'bancontact', 'paypal'],
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: [
          'NL',
          'BE',
          'DE',
          'FR',
          'IT',
          'ES',
          'AT',
          'PT',
          'IE',
          'LU',
          'PL',
          'SE',
          'DK',
          'FI',
          'AE',
          'GB',
          'US',
        ],
      },
      line_items: order.lines.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: 'eur',
          unit_amount: eurosToStripeCents(line.unitPrice),
          product_data: {
            name: line.name.slice(0, 120),
            metadata: {
              productId: line.productId,
              sku: line.sku || '',
            },
          },
        },
      })),
      success_url: successUrl,
      cancel_url: cancelUrl,
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    if (!session.url) {
      return NextResponse.json({ error: 'Stripe session missing redirect URL' }, { status: 502 })
    }

    await setOrderStripeSessionId(order.orderId, session.id)

    return NextResponse.json({
      url: session.url,
      orderId: order.orderId,
      orderNumber: order.orderNumber,
    })
  } catch (error) {
    console.error('[shop/checkout]', error)
    return NextResponse.json({ error: 'Failed to start checkout' }, { status: 500 })
  }
}
