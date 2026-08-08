import { cache } from 'react'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { APP_ICON_PATH, APP_NAME } from '@/lib/brand'
import { loadSiteSettings } from '@/lib/settings-persistence'
import { resolveSiteTagline } from '@/lib/site-tagline'
import { withNoIndexMetadata } from '@/lib/no-index'
import { type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { appUrl } from '@/lib/paths'
import { getCachedValue } from '@/lib/server-ttl-cache'
import {
  resolveHostSiteBrand,
  resolveRequestHostname,
  resolveRequestOrigin,
  resolveStoreModeFromHost,
} from '@/lib/store-host'
import {
  loadFeaturedBrandSettings,
  resolveFeaturedDisplayBrand,
} from '@/lib/featured-brand'

export type SiteSeo = {
  siteName: string
  tagline: string
  /** When set, used as the homepage browser tab title instead of "name — tagline". */
  homepageTitle: string
}

const SITE_SEO_CACHE_NS = 'site-seo'
const SITE_SEO_TTL_MS = 120_000

/** Site name + localized tagline (optional DB override + per-host brand). */
export const getSiteSeo = cache(async (locale: Locale = DEFAULT_LOCALE): Promise<SiteSeo> => {
  const hostname = resolveRequestHostname(headers())
  const storeMode = resolveStoreModeFromHost(hostname)
  const hostBrand = resolveHostSiteBrand(hostname)

  try {
    const base = await getCachedValue(SITE_SEO_CACHE_NS, locale, SITE_SEO_TTL_MS, async () => {
      const { settings } = await loadSiteSettings()
      return {
        siteName: settings.site_name?.trim() || APP_NAME,
        tagline: resolveSiteTagline(locale, settings.site_tagline),
        homepageTitle: settings.homepage_title?.trim() || '',
      }
    })

    if (storeMode === 'featured') {
      try {
        const featured = await getCachedValue(
          'featured-brand',
          'seo',
          SITE_SEO_TTL_MS,
          () => loadFeaturedBrandSettings()
        )
        const display = resolveFeaturedDisplayBrand(featured, hostname)
        return {
          siteName: display.site_name,
          tagline: display.site_tagline.trim() || base.tagline,
          homepageTitle: display.homepage_title,
        }
      } catch {
        if (hostBrand) {
          return {
            siteName: hostBrand.site_name,
            tagline: hostBrand.site_tagline?.trim() || base.tagline,
            homepageTitle: '',
          }
        }
      }
    } else if (hostBrand) {
      return {
        siteName: hostBrand.site_name,
        tagline: hostBrand.site_tagline?.trim() || base.tagline,
        homepageTitle: base.homepageTitle,
      }
    }
    return base
  } catch {
    if (hostBrand) {
      return {
        siteName: hostBrand.site_name,
        tagline: hostBrand.site_tagline?.trim() || resolveSiteTagline(locale),
        homepageTitle: '',
      }
    }
    return {
      siteName: APP_NAME,
      tagline: resolveSiteTagline(locale),
      homepageTitle: '',
    }
  }
})

/** Default browser tab title: custom homepage title, else "Site name — tagline". */
export function formatDefaultTitle({ siteName, tagline, homepageTitle }: SiteSeo): string {
  const custom = homepageTitle?.trim()
  if (custom) return custom
  if (tagline) return `${siteName} — ${tagline}`
  return siteName
}

/** Page-specific title: "Page | Site name" */
export function formatPageTitle(pageTitle: string, siteName: string): string {
  return `${pageTitle} | ${siteName}`
}

export async function buildRootMetadata(locale: Locale = DEFAULT_LOCALE): Promise<Metadata> {
  const seo = await getSiteSeo(locale)
  const defaultTitle = formatDefaultTitle(seo)
  const metadataBase = new URL(resolveRequestOrigin(headers(), appUrl()))

  return withNoIndexMetadata({
    metadataBase,
    applicationName: seo.siteName,
    title: {
      default: defaultTitle,
      template: `%s | ${seo.siteName}`,
    },
    description: seo.tagline,
    manifest: '/manifest.webmanifest',
    icons: {
      icon: [{ url: APP_ICON_PATH, type: 'image/png' }],
      apple: [{ url: APP_ICON_PATH, type: 'image/png' }],
      shortcut: APP_ICON_PATH,
    },
  })
}

export async function buildPageMetadata(
  pageTitle: string,
  description?: string,
  locale: Locale = DEFAULT_LOCALE
): Promise<Metadata> {
  const seo = await getSiteSeo(locale)
  return withNoIndexMetadata({
    title: pageTitle,
    description: description?.trim() || seo.tagline,
  })
}
