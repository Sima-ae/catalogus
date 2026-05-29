import { NextResponse } from 'next/server'
import { loadSiteSettings } from '@/lib/settings-persistence'
import { getDbErrorMessage } from '@/lib/db-errors'
import { logDbRouteError } from '@/lib/db-route-log'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Public storefront fields only (e.g. contact page support email). */
export async function GET() {
  try {
    const { settings } = await loadSiteSettings()
    return NextResponse.json({
      site_name: settings.site_name,
      site_tagline: settings.site_tagline,
      support_email: settings.support_email,
    })
  } catch (error) {
    logDbRouteError('Public settings fetch error', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load settings') },
      { status: 503 }
    )
  }
}
