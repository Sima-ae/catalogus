import { NextRequest, NextResponse } from 'next/server'
import { loadSiteSettings } from '@/lib/settings-persistence'
import { getDbErrorMessage } from '@/lib/db-errors'
import { logDbRouteError } from '@/lib/db-route-log'
import { resolveSiteTagline } from '@/lib/site-tagline'
import { getServerLocale } from '@/lib/i18n-server-locale'
import { resolveStoreModeFromHeaders } from '@/lib/store-host'
import { loadFeaturedBrandSettings } from '@/lib/featured-brand'
import { resolveFeaturedDisplayBrand } from '@/lib/featured-brand-shared'
import { FEATURED_APP_NAME } from '@/lib/brand'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const FEATURED_SUPPORT_EMAIL = 'info@1-1.club'

/** Public storefront fields only (e.g. contact page support email). */
export async function GET(request: NextRequest) {
  try {
    const locale = await getServerLocale()
    const storeMode = resolveStoreModeFromHeaders(request.headers)
    const { settings } = await loadSiteSettings()

    if (storeMode === 'featured') {
      const featured = await loadFeaturedBrandSettings()
      const host = request.headers.get('host')
      const display = resolveFeaturedDisplayBrand(featured, host)
      return NextResponse.json(
        {
          site_name: display.site_name || FEATURED_APP_NAME,
          site_tagline: display.site_tagline || resolveSiteTagline(locale, settings.site_tagline),
          support_email: FEATURED_SUPPORT_EMAIL,
          currency: settings.currency,
        },
        {
          headers: {
            'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
          },
        }
      )
    }

    return NextResponse.json(
      {
        site_name: settings.site_name,
        site_tagline: resolveSiteTagline(locale, settings.site_tagline),
        support_email: settings.support_email,
        currency: settings.currency,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    logDbRouteError('Public settings fetch error', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load settings') },
      { status: 503 }
    )
  }
}
