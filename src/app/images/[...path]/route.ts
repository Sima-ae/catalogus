import { readFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { getCatalogImagesRoots } from '@/lib/catalog-images-root'
import { NO_INDEX_RESPONSE_HEADERS } from '@/lib/no-index'
import { ensureEnvLoaded } from '@/lib/ensure-env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
}

function isSafeSegment(segment: string): boolean {
  return Boolean(segment) && segment !== '.' && segment !== '..' && !segment.includes('/')
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  ensureEnvLoaded()
  const { path: segments } = await context.params
  if (!Array.isArray(segments) || segments.length === 0) {
    return new NextResponse('Not found', { status: 404 })
  }

  if (!segments.every(isSafeSegment)) {
    return new NextResponse('Bad request', { status: 400 })
  }

  const fileName = segments[segments.length - 1]!
  const ext = path.extname(fileName).toLowerCase()
  const contentType = MIME[ext]
  if (!contentType) {
    return new NextResponse('Not found', { status: 404 })
  }

  const relative = segments.join(path.sep)

  for (const root of getCatalogImagesRoots()) {
    const filePath = path.join(root, relative)
    const resolved = path.resolve(filePath)
    const resolvedRoot = path.resolve(root)
    if (!resolved.startsWith(resolvedRoot + path.sep) && resolved !== resolvedRoot) {
      continue
    }

    try {
      const body = await readFile(resolved)
      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'private, max-age=604800, immutable',
          ...NO_INDEX_RESPONSE_HEADERS,
        },
      })
    } catch {
      /* try next root */
    }
  }

  return new NextResponse('Not found', { status: 404 })
}
