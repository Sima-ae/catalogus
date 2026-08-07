import { NextRequest, NextResponse } from 'next/server'
import { getProductById } from '@/lib/products-db'
import { getDbErrorMessage } from '@/lib/db-errors'
import { clientIp } from '@/lib/request-client-ip'
import { isRateLimitedIp } from '@/lib/bot-traffic'
import {
  checkAndMarkYupooSourceUnavailable,
  markProductsSoldOutUnavailable,
} from '@/lib/mark-source-unavailable'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Client reports a broken product image (onError). We only mark sold out after
 * a confirmed Yupoo album check — never from a single flaky / slow image load.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ip = clientIp(request)
  if (isRateLimitedIp(`report-unavailable:${ip}`, 20, 60_000)) {
    return NextResponse.json({ ok: true, marked: false, reason: 'rate_limited' })
  }

  try {
    const product = await getProductById(params.id)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const sourceUrl = product.source_url != null ? String(product.source_url) : ''
    const imageUrl = product.image_url != null ? String(product.image_url) : ''
    const isYupoo =
      /yupoo\.com/i.test(sourceUrl) ||
      /yupoo\.com/i.test(imageUrl) ||
      imageUrl.includes('/api/yupoo-image')

    if (!isYupoo) {
      return NextResponse.json({ ok: true, marked: false, reason: 'not_yupoo' })
    }

    if (Boolean(product.sold_out)) {
      // Already OOS — still clear dead Yupoo image URLs if present
      const result = await markProductsSoldOutUnavailable(
        [params.id],
        'client_clear_sold_out_images'
      )
      return NextResponse.json({
        ok: true,
        marked: result.marked > 0,
        reason: 'already_sold_out',
      })
    }

    // Blank / proxy-only images are not enough — require a live album check.
    if (sourceUrl && /yupoo\.com/i.test(sourceUrl)) {
      const result = await checkAndMarkYupooSourceUnavailable(
        params.id,
        sourceUrl,
        'client_broken_image'
      )
      return NextResponse.json({
        ok: true,
        marked: result.marked,
        reason: result.reason ?? null,
      })
    }

    // No album URL to verify — do not mark from a client image error alone.
    return NextResponse.json({
      ok: true,
      marked: false,
      reason: 'no_album_url',
    })
  } catch (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to report unavailable product') },
      { status: 503 }
    )
  }
}
