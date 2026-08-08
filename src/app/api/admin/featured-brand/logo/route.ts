import { NextRequest, NextResponse } from 'next/server'
import { superAdminDenial, verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { logDbRouteError } from '@/lib/db-route-log'
import {
  saveFeaturedBrandLogoUpload,
  type FeaturedLogoVariant,
} from '@/lib/featured-brand-logo-upload'
import { saveFeaturedBrandSettings } from '@/lib/featured-brand'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function parseVariant(raw: FormDataEntryValue | null): FeaturedLogoVariant {
  return String(raw ?? '').trim() === 'white' ? 'white' : 'default'
}

/** Super admin: upload a logo for 1-1.club and persist its URL in settings. */
export async function POST(request: NextRequest) {
  const denied = superAdminDenial(await verifyAdminActor(request))
  if (denied) return denied

  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
    }
    const variant = parseVariant(form.get('variant'))
    const { url } = await saveFeaturedBrandLogoUpload(file, variant)
    const key =
      variant === 'white' ? 'featured_logo_path_white' : 'featured_logo_path'
    const settings = await saveFeaturedBrandSettings({ [key]: url })
    return NextResponse.json({ url, settings, variant })
  } catch (error) {
    logDbRouteError('POST /api/admin/featured-brand/logo', error)
    const message =
      error instanceof Error ? error.message : getDbErrorMessage(error, 'Upload failed')
    const status =
      /only jpeg|must be|required/i.test(message) ? 400 : 503
    return NextResponse.json({ error: message }, { status })
  }
}
