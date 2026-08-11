import Stripe from 'stripe'

function looksLikeStripeKey(value: string | undefined, prefix: 'sk_' | 'pk_' | 'whsec_'): boolean {
  const v = value?.trim() || ''
  if (!v.startsWith(prefix)) return false
  if (v.includes('...')) return false
  return v.length >= 20
}

export function isStripeConfigured(): boolean {
  return looksLikeStripeKey(process.env.STRIPE_SECRET_KEY, 'sk_')
}

export function isStripePublishableConfigured(): boolean {
  return looksLikeStripeKey(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, 'pk_')
}

export function isStripeWebhookConfigured(): boolean {
  return looksLikeStripeKey(process.env.STRIPE_WEBHOOK_SECRET, 'whsec_')
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!looksLikeStripeKey(key, 'sk_')) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return new Stripe(key!, {
    apiVersion: '2025-08-27.basil',
  })
}
