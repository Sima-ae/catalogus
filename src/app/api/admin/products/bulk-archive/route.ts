import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import {
  bulkArchiveProducts,
  countBulkArchiveProducts,
  type BulkArchiveProductsInput,
} from '@/lib/products-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const VALID_STATUSES = ['inactive', 'trash'] as const

function parseBody(body: Record<string, unknown>): {
  ok: true
  input: BulkArchiveProductsInput
  dryRun: boolean
} | { ok: false; error: string } {
  const categoryIds = Array.isArray(body.categoryIds)
    ? body.categoryIds.map(String).map((id) => id.trim()).filter(Boolean)
    : []
  const brands = Array.isArray(body.brands)
    ? body.brands.map(String).map((b) => b.trim()).filter(Boolean)
    : []
  const albumDateBefore = String(
    body.albumDateBefore ?? body.createdBefore ?? ''
  ).trim()
  const status = String(body.status ?? 'inactive').trim() as BulkArchiveProductsInput['status']
  const dryRun = body.dryRun === true

  if (!categoryIds.length && !brands.length) {
    return { ok: false, error: 'Select at least one category or brand' }
  }
  if (!DATE_RE.test(albumDateBefore)) {
    return { ok: false, error: 'albumDateBefore must be YYYY-MM-DD' }
  }
  if (!VALID_STATUSES.includes(status)) {
    return { ok: false, error: 'status must be inactive or trash' }
  }

  return {
    ok: true,
    dryRun,
    input: {
      categoryIds: categoryIds.length ? categoryIds : undefined,
      brands: brands.length ? brands : undefined,
      albumDateBefore,
      status,
    },
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    const parsed = parseBody(body)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { input, dryRun } = parsed
    const matchCount = await countBulkArchiveProducts(input)

    if (dryRun) {
      return NextResponse.json({ matchCount, dryRun: true, status: input.status })
    }

    const updated = await bulkArchiveProducts(input)
    return NextResponse.json({ updated, matchCount, status: input.status })
  } catch (error) {
    console.error('Bulk archive products error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to archive products') },
      { status: 503 }
    )
  }
}
