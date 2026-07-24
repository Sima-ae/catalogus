import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { NO_INDEX_RESPONSE_HEADERS } from '@/lib/no-index'
import { yupooImageUrlFallbackChain } from '@/lib/product-image-url'
import { DEFAULT_FETCH_UA } from '@/lib/yupoo/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CACHE_DIR = path.join(process.cwd(), '.cache', 'yupoo-images')
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

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

function cacheKey(remoteUrl: string): string {
  return createHash('sha256').update(remoteUrl).digest('hex')
}

async function readDiskCache(
  remoteUrl: string
): Promise<{ body: Buffer; contentType: string } | null> {
  const key = cacheKey(remoteUrl)
  const bodyPath = path.join(CACHE_DIR, `${key}.bin`)
  const metaPath = path.join(CACHE_DIR, `${key}.json`)
  try {
    const [metaRaw, body, stat] = await Promise.all([
      fs.readFile(metaPath, 'utf8'),
      fs.readFile(bodyPath),
      fs.stat(bodyPath),
    ])
    if (Date.now() - stat.mtimeMs > CACHE_MAX_AGE_MS) return null
    const meta = JSON.parse(metaRaw) as { contentType?: string }
    return {
      body,
      contentType: meta.contentType || 'image/jpeg',
    }
  } catch {
    return null
  }
}

async function writeDiskCache(
  remoteUrl: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
    const key = cacheKey(remoteUrl)
    await Promise.all([
      fs.writeFile(path.join(CACHE_DIR, `${key}.bin`), body),
      fs.writeFile(
        path.join(CACHE_DIR, `${key}.json`),
        JSON.stringify({ contentType, url: remoteUrl, savedAt: Date.now() })
      ),
    ])
  } catch {
    // Cache write failures must not break image serving.
  }
}

function imageResponse(body: Buffer, contentType: string): NextResponse {
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      ...NO_INDEX_RESPONSE_HEADERS,
    },
  })
}

async function fetchYupooImage(
  remoteUrl: string,
  referer: string
): Promise<NextResponse | null> {
  const cached = await readDiskCache(remoteUrl)
  if (cached) return imageResponse(cached.body, cached.contentType)

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
    if (!upstream.ok) return null

    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    const body = Buffer.from(await upstream.arrayBuffer())
    void writeDiskCache(remoteUrl, body, contentType)
    return imageResponse(body, contentType)
  } catch {
    return null
  }
}

/** Stream Yupoo CDN images with the Referer header their CDN requires. */
export async function GET(request: NextRequest) {
  const remoteUrl = request.nextUrl.searchParams.get('url')?.trim()
  if (!remoteUrl || !isAllowedYupooImageUrl(remoteUrl)) {
    return new NextResponse('Invalid image URL', { status: 400 })
  }

  const refParam = request.nextUrl.searchParams.get('ref')?.trim()
  const referer =
    refParam && isAllowedReferer(refParam) ? refParam : 'https://x.yupoo.com/'

  for (const candidate of yupooImageUrlFallbackChain(remoteUrl)) {
    if (!isAllowedYupooImageUrl(candidate)) continue
    const response = await fetchYupooImage(candidate, referer)
    if (response) return response
  }

  return new NextResponse('Image unavailable', { status: 404 })
}
