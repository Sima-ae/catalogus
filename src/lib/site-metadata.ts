import { cache } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import type { Metadata } from 'next'
import { APP_ICON_PATH, APP_NAME } from '@/lib/brand'
import { loadSiteSettings } from '@/lib/settings-persistence'
import { resolveSiteTagline } from '@/lib/site-tagline'
import { withNoIndexMetadata } from '@/lib/no-index'
import { type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { appUrl } from '@/lib/paths'

export type SiteSeo = {
  siteName: string
  tagline: string
}

/** Site name + localized tagline (optional DB override). */
export const getSiteSeo = cache(async (locale: Locale = DEFAULT_LOCALE): Promise<SiteSeo> => {
  noStore()
  try {
    const { settings } = await loadSiteSettings()
    return {
      siteName: settings.site_name?.trim() || APP_NAME,
      tagline: resolveSiteTagline(locale, settings.site_tagline),
    }
  } catch {
    return {
      siteName: APP_NAME,
      tagline: resolveSiteTagline(locale),
    }
  }
})

/** Default browser tab title: "Site name — tagline" */
export function formatDefaultTitle({ siteName, tagline }: SiteSeo): string {
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

  return withNoIndexMetadata({
    metadataBase: new URL(appUrl()),
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
