import { NextResponse } from 'next/server'
import {
  isStripeConfigured,
  isStripePublishableConfigured,
  isStripeWebhookConfigured,
} from '@/lib/shop-stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Lightweight probe: is Stripe ready for Checkout Sessions? */
export async function GET() {
  const configured = isStripeConfigured()
  const publishable = isStripePublishableConfigured()
  const webhook = isStripeWebhookConfigured()
  return NextResponse.json({
    configured,
    publishableKey: publishable,
    webhookSecret: webhook,
    ready: configured && publishable,
  })
}
