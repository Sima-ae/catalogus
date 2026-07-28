import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import {
  applyUnavailableSourceSoldOut,
  scanUnavailableSourceProducts,
} from '@/lib/scan-unavailable-sources'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
/** Allow long Yupoo checks on Node hosts (ignored on short-timeout platforms). */
export const maxDuration = 300

/** Dry-run scan — returns candidates for admin approval. */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const limitParam = Number(request.nextUrl.searchParams.get('limit') || '80')
    const limit = Math.min(120, Math.max(1, Number.isFinite(limitParam) ? limitParam : 80))
    const result = await scanUnavailableSourceProducts({
      limit,
      concurrency: 2,
      delayMs: 450,
      rotateChecked: true,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Unavailable source scan error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to scan for unavailable sources') },
      { status: 503 }
    )
  }
}

/** Apply sold-out after admin approval. */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      productIds?: unknown
    } | null
    const productIds = Array.isArray(body?.productIds)
      ? body!.productIds.map((id) => String(id || '').trim()).filter(Boolean)
      : []
    if (!productIds.length) {
      return NextResponse.json({ error: 'No products selected' }, { status: 400 })
    }
    if (productIds.length > 500) {
      return NextResponse.json({ error: 'Too many products selected' }, { status: 400 })
    }

    const result = await applyUnavailableSourceSoldOut(productIds)
    return NextResponse.json({
      ok: true,
      marked: result.marked,
      ids: result.ids,
    })
  } catch (error) {
    console.error('Unavailable source apply error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to mark products out of stock') },
      { status: 503 }
    )
  }
}
