import { NextResponse } from 'next/server'
import { queryDb } from '@/lib/db'
import { getDbErrorMessage } from '@/lib/db-errors'
import { ACTIVITY_POOL_CACHE_CONTROL, jsonCached } from '@/lib/http-cache'
import { getCachedValue } from '@/lib/server-ttl-cache'
import { productImageSrc } from '@/lib/product-image-url'
import type { SocialProofProduct } from '@/lib/social-proof-activity'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SOCIAL_PROOF_CACHE_NS = 'social-proof-pool'
const SOCIAL_PROOF_CACHE_TTL_MS = 300_000

function socialProofLabel(name: string, sku: string | null): string | null {
  const n = name?.trim()
  if (n) return n
  const s = sku?.trim()
  return s || null
}

async function loadSocialProofProducts(): Promise<SocialProofProduct[]> {
  const rows = await queryDb<{ name: string; sku: string | null; image_url: string | null }[]>(
    `SELECT name, sku, image_url FROM products
     WHERE status = 'active'
       AND image_url IS NOT NULL AND TRIM(image_url) <> ''
       AND (
         (name IS NOT NULL AND TRIM(name) <> '')
         OR (sku IS NOT NULL AND TRIM(sku) <> '')
       )
     ORDER BY created_at DESC
     LIMIT 200`
  )
  const byLabel = new Map<string, SocialProofProduct>()
  for (const row of rows) {
    const label = socialProofLabel(row.name, row.sku)
    if (!label) continue
    const key = label.toLowerCase()
    if (byLabel.has(key)) continue
    const imageUrl = productImageSrc(row.image_url)
    byLabel.set(key, { label, imageUrl: imageUrl || null })
  }
  return Array.from(byLabel.values())
}

/** Published product labels + images for client-side daily social-proof. */
export async function GET() {
  try {
    const products = await getCachedValue(
      SOCIAL_PROOF_CACHE_NS,
      'pool-v2',
      SOCIAL_PROOF_CACHE_TTL_MS,
      loadSocialProofProducts
    )
    return jsonCached({ products }, ACTIVITY_POOL_CACHE_CONTROL)
  } catch (error) {
    console.error('Social proof fetch error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load catalog activity') },
      { status: 503 }
    )
  }
}
