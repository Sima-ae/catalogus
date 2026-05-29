import { cache } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import type { Metadata } from 'next'
import { APP_NAME } from '@/lib/brand'
import { loadSiteSettings } from '@/lib/settings-persistence'
import { DEFAULT_SITE_SETTINGS } from '@/lib/site-settings'
import { appUrl } from '@/lib/paths'

export type SiteSeo = {
  siteName: string
  tagline: string
}

/** Site name + tagline from DB (admin settings), with fallbacks. */
export const getSiteSeo = cache(async (): Promise<SiteSeo> => {
  noStore()
  try {
    const { settings } = await loadSiteSettings()
    return {
      siteName: settings.site_name?.trim() || APP_NAME,
      tagline:
        settings.site_tagline?.trim() || DEFAULT_SITE_SETTINGS.site_tagline,
    }
  } catch {
    return {
      siteName: APP_NAME,
      tagline: DEFAULT_SITE_SETTINGS.site_tagline,
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

export async function buildRootMetadata(): Promise<Metadata> {
  const seo = await getSiteSeo()
  const defaultTitle = formatDefaultTitle(seo)

  return {
    metadataBase: new URL(appUrl()),
    title: {
      default: defaultTitle,
      template: `%s | ${seo.siteName}`,
    },
    description: seo.tagline,
    openGraph: {
      title: defaultTitle,
      description: seo.tagline,
      siteName: seo.siteName,
    },
  }
}

export async function buildPageMetadata(
  pageTitle: string,
  description?: string
): Promise<Metadata> {
  const seo = await getSiteSeo()
  return {
    title: pageTitle,
    description: description?.trim() || seo.tagline,
  }
}
