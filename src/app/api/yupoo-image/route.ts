import { NextRequest, NextResponse } from 'next/server'
import { NO_INDEX_RESPONSE_HEADERS } from '@/lib/no-index'
import { DEFAULT_FETCH_UA } from '@/lib/yupoo/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isAllowedYupooImageUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    return u.hostname.toLowerCase().endsWith('yupoo.com')
  } catch {
    return false
  }
}

function isAllowedReferer(url: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname.toLowerCase().endsWith('yupoo.com')
  } catch {
    return false
  }
}

/** Stream Yupoo CDN images with the Referer header their CDN requires (no local copy). */
export async function GET(request: NextRequest) {
  const remoteUrl = request.nextUrl.searchParams.get('url')?.trim()
  if (!remoteUrl || !isAllowedYupooImageUrl(remoteUrl)) {
    return new NextResponse('Invalid image URL', { status: 400 })
  }

  const refParam = request.nextUrl.searchParams.get('ref')?.trim()
  const referer =
    refParam && isAllowedReferer(refParam) ? refParam : 'https://x.yupoo.com/'

  try {
    const upstream = await fetch(remoteUrl, {
      headers: {
        'User-Agent': DEFAULT_FETCH_UA,
        Referer: referer,
        Accept: 'image/*,*/*;q=0.8',
      },
      redirect: 'follow',
      cache: 'force-cache',
    })

    if (!upstream.ok) {
      return new NextResponse('Image unavailable', { status: upstream.status === 404 ? 404 : 502 })
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    const body = await upstream.arrayBuffer()

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=86400, stale-while-revalidate=604800',
        ...NO_INDEX_RESPONSE_HEADERS,
      },
    })
  } catch {
    return new NextResponse('Failed to fetch image', { status: 502 })
  }
}
