import { NextRequest, NextResponse } from 'next/server'
import { superAdminDenial, verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { getPricelistShareSettings } from '@/lib/pricelist-share-db'
import {
  countPricelistPageItems,
  createPricelistPage,
  listPricelistPages,
  ownerIdToSlug,
} from '@/lib/pricelist-pages-db'
import { buildPricelistShareUrl } from '@/lib/pricelist-share-url'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const denied = superAdminDenial(auth)
  if (denied) return denied

  try {
    const pages = await listPricelistPages()
    const enriched = await Promise.all(
      pages.map(async (p) => {
        const [itemCount, share] = await Promise.all([
          countPricelistPageItems(p.id),
          getPricelistShareSettings(p.id),
        ])
        return {
          ...p,
          slug: p.slug,
          sharePath: buildPricelistShareUrl(p.id),
          shareQuery: `owner=${ownerIdToSlug(p.id)}`,
          hasPassword: share.has_password,
          itemCount,
        }
      })
    )
    return NextResponse.json(enriched)
  } catch (error) {
    console.error('Admin pricelist pages GET:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load pricelist pages') },
      { status: 503 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const denied = superAdminDenial(auth)
  if (denied) return denied

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const slug = String(raw.slug ?? '').trim()
  const label = String(raw.label ?? '').trim()
  const sortOrder =
    raw.sortOrder != null ? Number(raw.sortOrder) : undefined

  try {
    const page = await createPricelistPage({
      slug,
      label,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : undefined,
    })
    return NextResponse.json(
      {
        ...page,
        sharePath: buildPricelistShareUrl(page.id),
        shareQuery: `owner=${page.slug}`,
        hasPassword: false,
        itemCount: 0,
      },
      { status: 201 }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Slug') || msg.includes('Label') || msg.includes('already')) {
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    console.error('Admin pricelist pages POST:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to create pricelist page') },
      { status: 503 }
    )
  }
}
