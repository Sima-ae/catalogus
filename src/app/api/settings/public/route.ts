import { NextRequest, NextResponse } from 'next/server'
import { loadSiteSettings } from '@/lib/settings-persistence'
import { getDbErrorMessage } from '@/lib/db-errors'
import { logDbRouteError } from '@/lib/db-route-log'
import { resolveSiteTagline } from '@/lib/site-tagline'
import { getServerLocale } from '@/lib/i18n-server-locale'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Public storefront fields only (e.g. contact page support email). */
export async function GET(_request: NextRequest) {
  try {
    const locale = await getServerLocale()
    const { settings } = await loadSiteSettings()
    return NextResponse.json({
      site_name: settings.site_name,
      site_tagline: resolveSiteTagline(locale, settings.site_tagline),
      support_email: settings.support_email,
      currency: settings.currency,
    })
  } catch (error) {
    logDbRouteError('Public settings fetch error', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load settings') },
      { status: 503 }
    )
  }
}
