import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { isCatalogModeEnabled, setCatalogMode } from '@/lib/catalog-mode'
import { getDbErrorMessage } from '@/lib/db-errors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function superAdminOnly(auth: Awaited<ReturnType<typeof verifyAdminActor>>) {
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  if (!auth.actor.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Only super admin can change catalog mode' },
      { status: 403 }
    )
  }
  return null
}

/** Super admin: read catalog mode setting. */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  const denied = superAdminOnly(auth)
  if (denied) return denied

  try {
    return NextResponse.json({ catalogMode: await isCatalogModeEnabled() })
  } catch (error) {
    console.error('Admin catalog mode GET error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load catalog mode') },
      { status: 503 }
    )
  }
}

/** Super admin: enable or disable catalog mode. */
export async function PUT(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  const denied = superAdminOnly(auth)
  if (denied) return denied

  const body = await request.json().catch(() => ({}))
  const enabled = body.enabled === true || body.enabled === 'true'

  try {
    await setCatalogMode(enabled)
    return NextResponse.json({ catalogMode: await isCatalogModeEnabled() })
  } catch (error) {
    console.error('Admin catalog mode PUT error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to save catalog mode') },
      { status: 503 }
    )
  }
}
