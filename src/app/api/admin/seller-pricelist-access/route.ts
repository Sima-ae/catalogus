import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { createSellerAccess, listSellerAccess } from '@/lib/seller-pricelist-access-db'
import {
  ensurePricelistPagesCache,
  getPricelistPageById,
  isCuratedSupplierPricelist,
  ownerIdToSlug,
  resolvePricelistOwnerId,
} from '@/lib/pricelist-pages-db'
import { queryDb } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function resolveListOwnerId(raw: string): Promise<string | null> {
  await ensurePricelistPagesCache()
  return resolvePricelistOwnerId(raw)
}

async function labelForListOwner(listOwnerId: string): Promise<string> {
  const page = await getPricelistPageById(listOwnerId)
  if (page) return page.label
  return listOwnerId
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const sellerId = request.nextUrl.searchParams.get('sellerId')?.trim()
  const listOwnerRaw = request.nextUrl.searchParams.get('listOwnerId')?.trim()

  try {
    const listOwnerId = listOwnerRaw ? await resolveListOwnerId(listOwnerRaw) : undefined
    const rows = await listSellerAccess({
      sellerId: sellerId || undefined,
      listOwnerId: listOwnerId || undefined,
    })

    const enriched = await Promise.all(
      rows.map(async (r) => ({
        ...r,
        list_owner_label: await labelForListOwner(r.list_owner_id),
        list_owner_query: ownerIdToSlug(r.list_owner_id),
      }))
    )

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('Seller pricelist access GET:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load access grants') },
      { status: 503 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const sellerId = String(raw.sellerId ?? '').trim()
  const listOwnerRaw = String(raw.listOwnerId ?? '').trim()

  if (!sellerId || !listOwnerRaw) {
    return NextResponse.json({ error: 'sellerId and listOwnerId are required' }, { status: 400 })
  }

  const listOwnerId = await resolveListOwnerId(listOwnerRaw)
  if (!listOwnerId) {
    return NextResponse.json({ error: 'Invalid listOwnerId' }, { status: 400 })
  }

  try {
    const seller = await queryDb<{ role: string }[]>(
      'SELECT role FROM users WHERE id = ? LIMIT 1',
      [sellerId]
    )
    if (!seller[0] || seller[0].role !== 'seller') {
      return NextResponse.json({ error: 'sellerId must be a seller user' }, { status: 400 })
    }

    if (!isCuratedSupplierPricelist(listOwnerId)) {
      const buyer = await queryDb<{ role: string }[]>(
        'SELECT role FROM users WHERE id = ? LIMIT 1',
        [listOwnerId]
      )
      if (!buyer[0] || buyer[0].role !== 'buyer') {
        return NextResponse.json(
          { error: 'listOwnerId must be a supplier pricelist page or buyer' },
          { status: 400 }
        )
      }
    }

    const row = await createSellerAccess({ sellerId, listOwnerId })
    return NextResponse.json(
      {
        ...row,
        list_owner_query: ownerIdToSlug(row.list_owner_id),
        list_owner_label: await labelForListOwner(row.list_owner_id),
      },
      { status: 201 }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Duplicate') || msg.includes('uq_seller_list_owner')) {
      return NextResponse.json({ error: 'Access grant already exists' }, { status: 409 })
    }
    console.error('Seller pricelist access POST:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to create access grant') },
      { status: 503 }
    )
  }
}
