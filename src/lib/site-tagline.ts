import { getMessages, type Locale } from '@/lib/i18n'
import { DEFAULT_LOCALE } from '@/lib/i18n-locale-registry'

/** English default; localized via i18n (`site.tagline` / `badge.catalog2026`). */
export const DEFAULT_SITE_TAGLINE = 'Catalog 2026'

const LEGACY_SITE_TAGLINES = new Set([
  'digital marketplace for templates and digital assets',
  'catalog 2026',
])

export function isLegacyOrEmptySiteTagline(value: string | null | undefined): boolean {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return true
  return LEGACY_SITE_TAGLINES.has(trimmed.toLowerCase())
}

/** Localized store tagline for SEO, settings UI, and footers. */
export function resolveSiteTagline(
  locale: Locale = DEFAULT_LOCALE,
  dbValue?: string | null
): string {
  const trimmed = String(dbValue ?? '').trim()
  if (trimmed && !isLegacyOrEmptySiteTagline(trimmed)) {
    return trimmed
  }
  const messages = getMessages(locale)
  return (
    messages['site.tagline']?.trim() ||
    messages['badge.catalog2026']?.trim() ||
    DEFAULT_SITE_TAGLINE
  )
}

/** Clear legacy DB tagline so the localized default is used. */
export function normalizeSiteTaglineForStorage(value: string | null | undefined): string {
  if (isLegacyOrEmptySiteTagline(value)) return ''
  return String(value ?? '').trim()
}
