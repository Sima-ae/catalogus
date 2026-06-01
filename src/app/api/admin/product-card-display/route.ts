import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import {
  isProductCardDetailsEnabled,
  setProductCardDetailsEnabled,
} from '@/lib/product-card-display'
import { getDbErrorMessage } from '@/lib/db-errors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function superAdminOnly(auth: Awaited<ReturnType<typeof verifyAdminActor>>) {
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  if (!auth.actor.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Only super admin can change product card display' },
      { status: 403 }
    )
  }
  return null
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  const denied = superAdminOnly(auth)
  if (denied) return denied

  try {
    return NextResponse.json({ showCardDetails: await isProductCardDetailsEnabled() })
  } catch (error) {
    console.error('Admin product card display GET error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load product card display') },
      { status: 503 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  const denied = superAdminOnly(auth)
  if (denied) return denied

  const body = await request.json().catch(() => ({}))
  const enabled = body.enabled === true || body.enabled === 'true'

  try {
    await setProductCardDetailsEnabled(enabled)
    return NextResponse.json({ showCardDetails: await isProductCardDetailsEnabled() })
  } catch (error) {
    console.error('Admin product card display PUT error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to save product card display') },
      { status: 503 }
    )
  }
}
