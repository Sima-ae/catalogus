import { resolveHostSiteBrand } from '@/lib/store-host'

/** Settings keys for the 1-1.club (featured-only) storefront brand. */
export const FEATURED_BRAND_KEYS = [
  'featured_site_name',
  'featured_site_tagline',
  'featured_homepage_title',
  'featured_footer_menu',
  'featured_footer_copyright',
  'featured_logo_path',
  'featured_logo_path_white',
] as const

export type FeaturedBrandKey = (typeof FEATURED_BRAND_KEYS)[number]

export type FeaturedBrandSettings = Record<FeaturedBrandKey, string>

export const DEFAULT_FEATURED_BRAND_SETTINGS: FeaturedBrandSettings = {
  featured_site_name: '1-1 Club',
  featured_site_tagline: '',
  featured_homepage_title: '',
  featured_footer_menu: '',
  featured_footer_copyright: '1-1 Club © {year}',
  featured_logo_path: '',
  featured_logo_path_white: '',
}

type SettingRow = { key: string; value: string | null }

export function rowsToFeaturedBrand(rows: SettingRow[]): FeaturedBrandSettings {
  const out = { ...DEFAULT_FEATURED_BRAND_SETTINGS }
  for (const row of rows) {
    if ((FEATURED_BRAND_KEYS as readonly string[]).includes(row.key)) {
      out[row.key as FeaturedBrandKey] = row.value ?? ''
    }
  }
  return out
}

/** Resolve display brand for a featured host: DB settings first, then HOST_SITE_BRAND env. */
export function resolveFeaturedDisplayBrand(
  featured: FeaturedBrandSettings,
  hostname: string | null | undefined
): {
  site_name: string
  site_tagline: string
  homepage_title: string
  footer_menu: string
  footer_copyright: string
  logo_path: string
  logo_path_white: string
} {
  const envBrand = resolveHostSiteBrand(hostname)
  const site_name =
    featured.featured_site_name.trim() ||
    envBrand?.site_name?.trim() ||
    DEFAULT_FEATURED_BRAND_SETTINGS.featured_site_name
  const site_tagline =
    featured.featured_site_tagline.trim() || envBrand?.site_tagline?.trim() || ''
  const homepage_title = featured.featured_homepage_title.trim()
  const footer_menu = featured.featured_footer_menu.trim()
  const footer_copyright =
    featured.featured_footer_copyright.trim() ||
    DEFAULT_FEATURED_BRAND_SETTINGS.featured_footer_copyright
  const logo_path = featured.featured_logo_path.trim()
  const logo_path_white =
    featured.featured_logo_path_white.trim() || logo_path

  return {
    site_name,
    site_tagline,
    homepage_title,
    footer_menu,
    footer_copyright,
    logo_path,
    logo_path_white,
  }
}

export function formatFooterCopyright(template: string, year: number): string {
  const raw = String(template ?? '').trim()
  if (!raw) return ''
  return raw.replace(/\{year\}/gi, String(year))
}

export function clampFeaturedBrandValue(key: FeaturedBrandKey, value: string): string {
  const max =
    key.includes('logo')
      ? 500
      : key === 'featured_footer_menu'
        ? 2000
        : key === 'featured_homepage_title'
          ? 200
          : 600
  return String(value ?? '').trim().slice(0, max)
}
