import { NextRequest, NextResponse } from 'next/server'
import { superAdminDenial, verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { logDbRouteError } from '@/lib/db-route-log'
import {
  FEATURED_BRAND_KEYS,
  loadFeaturedBrandSettings,
  saveFeaturedBrandSettings,
  type FeaturedBrandKey,
  type FeaturedBrandSettings,
} from '@/lib/featured-brand'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function parseBody(body: unknown): Partial<FeaturedBrandSettings> {
  if (!body || typeof body !== 'object') return {}
  const raw = body as Record<string, unknown>
  const updates: Partial<FeaturedBrandSettings> = {}
  for (const key of FEATURED_BRAND_KEYS) {
    if (raw[key] !== undefined) {
      updates[key] = String(raw[key] ?? '').trim()
    }
  }
  return updates
}

/** Super admin: load 1-1.club storefront branding. */
export async function GET(request: NextRequest) {
  const denied = superAdminDenial(await verifyAdminActor(request))
  if (denied) return denied

  try {
    const settings = await loadFeaturedBrandSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    logDbRouteError('GET /api/admin/featured-brand', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load 1-1.club branding') },
      { status: 503 }
    )
  }
}

/** Super admin: save 1-1.club storefront branding. */
export async function PUT(request: NextRequest) {
  const denied = superAdminDenial(await verifyAdminActor(request))
  if (denied) return denied

  const updates = parseBody(await request.json().catch(() => ({})))
  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'No settings provided' }, { status: 400 })
  }

  // Require at least a site name when that field is being set empty — allow clearing logos.
  if (
    Object.prototype.hasOwnProperty.call(updates, 'featured_site_name') &&
    !String(updates.featured_site_name ?? '').trim()
  ) {
    return NextResponse.json({ error: 'Site name is required' }, { status: 400 })
  }

  try {
    const settings = await saveFeaturedBrandSettings(updates)
    return NextResponse.json({ settings })
  } catch (error) {
    logDbRouteError('PUT /api/admin/featured-brand', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to save 1-1.club branding') },
      { status: 503 }
    )
  }
}

export type { FeaturedBrandKey }
