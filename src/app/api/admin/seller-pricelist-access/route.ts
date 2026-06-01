import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { createSellerAccess, listSellerAccess } from '@/lib/seller-pricelist-access-db'
import {
  isPlatformPricelistOwner,
  PLATFORM_PRICELIST_OWNER_ID,
  PRICELIST_OWNER_QUERY_PLATFORM,
} from '@/lib/pricelist-constants'
import { queryDb } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function resolveListOwnerId(raw: string): string {
  if (raw === PRICELIST_OWNER_QUERY_PLATFORM || raw === 'platform') {
    return PLATFORM_PRICELIST_OWNER_ID
  }
  return raw
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const sellerId = request.nextUrl.searchParams.get('sellerId')?.trim()
  const listOwnerId = request.nextUrl.searchParams.get('listOwnerId')?.trim()

  try {
    const rows = await listSellerAccess({
      sellerId: sellerId || undefined,
      listOwnerId: listOwnerId ? resolveListOwnerId(listOwnerId) : undefined,
    })

    const enriched = rows.map((r) => ({
      ...r,
      list_owner_label: isPlatformPricelistOwner(r.list_owner_id)
        ? 'Platform pricelist'
        : r.list_owner_name || r.list_owner_email || r.list_owner_id,
      list_owner_query: isPlatformPricelistOwner(r.list_owner_id)
        ? PRICELIST_OWNER_QUERY_PLATFORM
        : r.list_owner_id,
    }))

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

  const listOwnerId = resolveListOwnerId(listOwnerRaw)

  try {
    const seller = await queryDb<{ role: string }[]>(
      'SELECT role FROM users WHERE id = ? LIMIT 1',
      [sellerId]
    )
    if (!seller[0] || seller[0].role !== 'seller') {
      return NextResponse.json({ error: 'sellerId must be a seller user' }, { status: 400 })
    }

    if (!isPlatformPricelistOwner(listOwnerId)) {
      const buyer = await queryDb<{ role: string }[]>(
        'SELECT role FROM users WHERE id = ? LIMIT 1',
        [listOwnerId]
      )
      if (!buyer[0] || buyer[0].role !== 'buyer') {
        return NextResponse.json({ error: 'listOwnerId must be a buyer or platform' }, { status: 400 })
      }
    }

    const row = await createSellerAccess({ sellerId, listOwnerId })
    return NextResponse.json(
      {
        ...row,
        list_owner_query: isPlatformPricelistOwner(row.list_owner_id)
          ? PRICELIST_OWNER_QUERY_PLATFORM
          : row.list_owner_id,
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
