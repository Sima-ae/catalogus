import { NextResponse } from 'next/server'
import { queryDb } from '@/lib/db'
import { getDbErrorMessage } from '@/lib/db-errors'
import { ACTIVITY_POOL_CACHE_CONTROL, jsonCached } from '@/lib/http-cache'
import { getCachedValue } from '@/lib/server-ttl-cache'

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

async function loadSocialProofNames(): Promise<string[]> {
  const rows = await queryDb<{ name: string; sku: string | null }[]>(
    `SELECT name, sku FROM products
     WHERE status = 'active'
       AND (
         (name IS NOT NULL AND TRIM(name) <> '')
         OR (sku IS NOT NULL AND TRIM(sku) <> '')
       )
     ORDER BY created_at DESC
     LIMIT 200`
  )
  return Array.from(
    new Set(
      rows
        .map((r) => socialProofLabel(r.name, r.sku))
        .filter((label): label is string => Boolean(label))
    )
  )
}

/** Published product labels for client-side daily social-proof (persisted per browser/day). */
export async function GET() {
  try {
    const productNames = await getCachedValue(
      SOCIAL_PROOF_CACHE_NS,
      'pool',
      SOCIAL_PROOF_CACHE_TTL_MS,
      loadSocialProofNames
    )
    return jsonCached({ productNames }, ACTIVITY_POOL_CACHE_CONTROL)
  } catch (error) {
    console.error('Social proof fetch error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load catalog activity') },
      { status: 503 }
    )
  }
}
