import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { approvePriceEditRequest } from '@/lib/seller-price-edit-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const requestId = String((body as Record<string, unknown>).requestId ?? '').trim()
  if (!requestId) {
    return NextResponse.json({ error: 'requestId is required' }, { status: 400 })
  }

  try {
    const row = await approvePriceEditRequest(requestId, auth.actor.userId)
    return NextResponse.json({ ok: true, request: row })
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    if (msg === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }
    if (msg === 'NOT_PENDING') {
      return NextResponse.json({ error: 'Request is no longer pending' }, { status: 409 })
    }
    console.error('Price edit approve POST:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to approve request') },
      { status: 503 }
    )
  }
}
