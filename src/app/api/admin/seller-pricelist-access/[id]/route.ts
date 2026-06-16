import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import {
  updateSellerAccessStatus,
  type AccessStatus,
} from '@/lib/seller-pricelist-access-db'
import { ownerIdToSlug } from '@/lib/pricelist-pages-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { id: string } }

const ALLOWED: AccessStatus[] = ['pending', 'approved', 'rejected']

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  const status = body && typeof body === 'object' ? String((body as Record<string, unknown>).status ?? '') : ''

  if (!ALLOWED.includes(status as AccessStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  try {
    const updated = await updateSellerAccessStatus(
      params.id,
      status as AccessStatus,
      status === 'approved' ? auth.actor.userId : null
    )
    if (!updated) {
      return NextResponse.json({ error: 'Grant not found' }, { status: 404 })
    }
    return NextResponse.json({
      ...updated,
      list_owner_query: ownerIdToSlug(updated.list_owner_id),
    })
  } catch (error) {
    console.error('Seller pricelist access PATCH:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to update access grant') },
      { status: 503 }
    )
  }
}
