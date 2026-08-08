import { NextRequest, NextResponse } from 'next/server'
import { getProductById } from '@/lib/products-db'
import { getDbErrorMessage } from '@/lib/db-errors'
import { clientIp } from '@/lib/request-client-ip'
import { isRateLimitedIp } from '@/lib/bot-traffic'
import {
  checkAndMarkYupooSourceUnavailable,
  markProductsSoldOutUnavailable,
} from '@/lib/mark-source-unavailable'
import { fetchHtmlResult } from '@/lib/yupoo/client'
import {
  classifySourcePageAvailability,
  isYupooUnavailableAlbumHtml,
} from '@/lib/yupoo/unavailable'
import { isYupooPasswordGateHtml } from '@/lib/yupoo/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isSupplierSourceUrl(url: string): boolean {
  return (
    /yupoo\.com/i.test(url) ||
    /wecatalog/i.test(url) ||
    /lkxox/i.test(url) ||
    /facebook\.com/i.test(url) ||
    /fb\.watch/i.test(url)
  )
}

/**
 * Client reports a broken / blank product image. Mark sold out when:
 * - image_url is already blank, or
 * - Yupoo album check confirms gone, or
 * - WeCatalog / other supplier page check confirms gone.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ip = clientIp(request)
  if (isRateLimitedIp(`report-unavailable:${ip}`, 30, 60_000)) {
    return NextResponse.json({ ok: true, marked: false, reason: 'rate_limited' })
  }

  try {
    const product = await getProductById(params.id)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const sourceUrl = product.source_url != null ? String(product.source_url) : ''
    const imageUrl = product.image_url != null ? String(product.image_url).trim() : ''
    const isYupoo =
      /yupoo\.com/i.test(sourceUrl) ||
      /yupoo\.com/i.test(imageUrl) ||
      imageUrl.includes('/api/yupoo-image')

    // Already OOS — still clear dead Yupoo image URLs if present.
    if (Boolean(product.sold_out)) {
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

    // Blank primary image → hide from shop immediately (any supplier).
    if (!imageUrl) {
      const result = await markProductsSoldOutUnavailable(
        [params.id],
        'client_blank_image'
      )
      return NextResponse.json({
        ok: true,
        marked: result.marked > 0,
        reason: 'blank_image',
      })
    }

    if (isYupoo && sourceUrl && /yupoo\.com/i.test(sourceUrl)) {
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

    // WeCatalog / lkxox / facebook: verify supplier page before marking.
    if (sourceUrl && isSupplierSourceUrl(sourceUrl) && !isYupoo) {
      try {
        const { status, html } = await fetchHtmlResult(sourceUrl)
        if (isYupooPasswordGateHtml(html)) {
          return NextResponse.json({
            ok: true,
            marked: false,
            reason: 'password_gate',
          })
        }
        const verdict = classifySourcePageAvailability({
          status,
          html,
          imageCount: null,
          hostHint: sourceUrl,
        })
        const albumGone =
          Boolean(html) &&
          /yupoo\.com/i.test(sourceUrl) &&
          isYupooUnavailableAlbumHtml(html)

        if (!verdict.ok || albumGone) {
          const reason = albumGone
            ? 'supplier_album_not_found'
            : !verdict.ok
              ? verdict.reason
              : 'supplier_unavailable'
          const result = await markProductsSoldOutUnavailable([params.id], reason)
          return NextResponse.json({
            ok: true,
            marked: result.marked > 0,
            reason,
          })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (/HTTP\s+404|HTTP\s+410/i.test(message)) {
          const result = await markProductsSoldOutUnavailable(
            [params.id],
            'supplier_http_gone'
          )
          return NextResponse.json({
            ok: true,
            marked: result.marked > 0,
            reason: 'supplier_http_gone',
          })
        }
        return NextResponse.json({
          ok: true,
          marked: false,
          reason: 'check_failed',
        })
      }

      return NextResponse.json({
        ok: true,
        marked: false,
        reason: 'available',
      })
    }

    // Broken external/import image with no verifiable supplier page — mark OOS so
    // blank cards leave the live catalog (client already confirmed load failure).
    const looksExternalDead =
      /yupoo\.com/i.test(imageUrl) ||
      imageUrl.includes('/api/yupoo-image') ||
      /\/images\/imports\//i.test(imageUrl) ||
      /wecatalog|lkxox/i.test(imageUrl)
    if (looksExternalDead) {
      const result = await markProductsSoldOutUnavailable(
        [params.id],
        'client_broken_image_no_source'
      )
      return NextResponse.json({
        ok: true,
        marked: result.marked > 0,
        reason: 'client_broken_image_no_source',
      })
    }

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
