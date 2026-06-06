import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { buildImportWorkerCommand } from '@/lib/admin-import'
import { getDbErrorMessage } from '@/lib/db-errors'
import { fetchFacebookPost } from '@/lib/facebook/parse-post'
import { normalizeFacebookPostUrl } from '@/lib/facebook/parse-url'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = (await request.json().catch(() => null)) as { postUrl?: string } | null
    const postUrl = String(body?.postUrl ?? '').trim()
    if (!postUrl) {
      return NextResponse.json({ error: 'postUrl is required' }, { status: 400 })
    }

    normalizeFacebookPostUrl(postUrl)
    const post = await fetchFacebookPost(postUrl)

    return NextResponse.json({
      title: post.title,
      descriptionPreview: post.description.slice(0, 280),
      imageCount: post.imageUrls.length,
      detectedPriceHint: post.detectedPriceHint,
      externalId: post.externalId,
    })
  } catch (error) {
    console.error('Facebook import preview error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to preview Facebook post') },
      { status: 503 }
    )
  }
}
