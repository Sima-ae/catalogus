import { NextResponse } from 'next/server'
import { queryDb } from '@/lib/db'
import { getDbErrorMessage } from '@/lib/db-errors'
import { ACTIVITY_POOL_CACHE_CONTROL, jsonCached } from '@/lib/http-cache'
import { getCachedValue } from '@/lib/server-ttl-cache'
import {
  isPlaceholderImageUrl,
  productImageSrc,
  toDisplayProductImageUrl,
} from '@/lib/product-image-url'
import type { SocialProofProduct } from '@/lib/social-proof-activity'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SOCIAL_PROOF_CACHE_NS = 'social-proof-pool'
const SOCIAL_PROOF_CACHE_TTL_MS = 300_000
const PER_CATEGORY_LIMIT = 10
const POOL_TARGET = 80

function socialProofLabel(name: string, sku: string | null): string | null {
  const n = name?.trim()
  if (n) return n
  const s = sku?.trim()
  return s || null
}

function shuffleRows<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const PRODUCT_BASE_WHERE = `
  status = 'active'
  AND image_url IS NOT NULL AND TRIM(image_url) <> ''
  AND (
    (name IS NOT NULL AND TRIM(name) <> '')
    OR (sku IS NOT NULL AND TRIM(sku) <> '')
  )
`

type ProductRow = {
  id: string
  name: string
  sku: string | null
  image_url: string | null
  category: string | null
  source_url: string | null
  rn: number
}

function rowToProduct(row: ProductRow, seenLabels: Set<string>): SocialProofProduct | null {
  const label = socialProofLabel(row.name, row.sku)
  if (!label) return null
  const labelKey = label.toLowerCase()
  if (seenLabels.has(labelKey)) return null
  seenLabels.add(labelKey)

  const displayUrl = toDisplayProductImageUrl(row.image_url, row.source_url)
  if (!displayUrl || isPlaceholderImageUrl(displayUrl)) return null
  const imageUrl = productImageSrc(displayUrl)
  if (!imageUrl) return null

  const category = row.category?.trim() || 'Other'
  const productId = String(row.id ?? '').trim()
  if (!productId) return null
  return { label, imageUrl, category, productId }
}

async function loadSocialProofProducts(): Promise<SocialProofProduct[]> {
  const rows = await queryDb<ProductRow[]>(
    `SELECT id, name, sku, image_url, category, source_url, rn FROM (
       SELECT
         id,
         name,
         sku,
         image_url,
         category,
         source_url,
         ROW_NUMBER() OVER (
           PARTITION BY TRIM(COALESCE(category, 'Other'))
           ORDER BY RAND()
         ) AS rn
       FROM products
       WHERE ${PRODUCT_BASE_WHERE}
     ) ranked
     WHERE rn <= ?
     ORDER BY RAND()
     LIMIT ?`,
    [PER_CATEGORY_LIMIT, POOL_TARGET * 2]
  )

  const byCategory = new Map<string, SocialProofProduct[]>()
  for (const row of rows) {
    const category = row.category?.trim() || 'Other'
    const bucket = byCategory.get(category) ?? []
    if (bucket.length >= PER_CATEGORY_LIMIT) continue
    const localSeen = new Set(bucket.map((p) => p.label.toLowerCase()))
    const product = rowToProduct(row, localSeen)
    if (product) bucket.push(product)
    if (bucket.length) byCategory.set(category, bucket)
  }

  const categoryOrder = shuffleRows(Array.from(byCategory.keys()))
  const pool: SocialProofProduct[] = []

  for (let round = 0; round < PER_CATEGORY_LIMIT; round++) {
    for (const category of categoryOrder) {
      const bucket = byCategory.get(category)!
      if (round < bucket.length) pool.push(bucket[round]!)
    }
  }

  return shuffleRows(pool).slice(0, POOL_TARGET)
}

/** Published product labels + images for client-side daily social-proof. */
export async function GET() {
  try {
    const products = await getCachedValue(
      SOCIAL_PROOF_CACHE_NS,
      'pool-v7',
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
