/**
 * Locale metadata: URL slug, flag asset, native display name (always shown in the picker).
 * Grid order matches the reference language modal (3 columns, top-to-bottom).
 */
export type LocaleMeta = {
  code: string
  slug: string
  flag: string
  nativeName: string
}

/** Row-major across 3 columns (col 0, col 1, col 2). */
const LOCALE_GRID: LocaleMeta[] = [
  { code: 'nl', slug: 'nl', flag: 'nl', nativeName: 'Nederlands' },
  { code: 'en', slug: 'en', flag: 'gb', nativeName: 'English' },
  { code: 'fr', slug: 'fr', flag: 'fr', nativeName: 'Français' },
  { code: 'de', slug: 'de', flag: 'de', nativeName: 'Deutsch' },
  { code: 'es', slug: 'es', flag: 'es', nativeName: 'Español' },
  { code: 'pt', slug: 'pt', flag: 'pt', nativeName: 'Português' },
  { code: 'it', slug: 'it', flag: 'it', nativeName: 'Italiano' },
  { code: 'gr', slug: 'gr', flag: 'gr', nativeName: 'Ελληνικά' },
  { code: 'pl', slug: 'pl', flag: 'pl', nativeName: 'Polski' },
  { code: 'cz', slug: 'cz', flag: 'cz', nativeName: 'Čeština' },
  { code: 'sk', slug: 'sk', flag: 'sk', nativeName: 'Slovenčina' },
  { code: 'hu', slug: 'hu', flag: 'hu', nativeName: 'Magyar' },
  { code: 'ro', slug: 'ro', flag: 'ro', nativeName: 'Română' },
  { code: 'bg', slug: 'bg', flag: 'bg', nativeName: 'Български' },
  { code: 'hr', slug: 'hr', flag: 'hr', nativeName: 'Hrvatski' },
  { code: 'sr', slug: 'sr', flag: 'rs', nativeName: 'Српски' },
  { code: 'ba', slug: 'ba', flag: 'ba', nativeName: 'Bosanski' },
  { code: 'me', slug: 'me', flag: 'me', nativeName: 'Crnogorski' },
  { code: 'sq', slug: 'sq', flag: 'sq', nativeName: 'Shqip' },
  { code: 'mk', slug: 'mk', flag: 'mk', nativeName: 'Македонски' },
  { code: 'lt', slug: 'lt', flag: 'lt', nativeName: 'Lietuvių' },
  { code: 'da', slug: 'da', flag: 'dk', nativeName: 'Dansk' },
  { code: 'sv', slug: 'sv', flag: 'se', nativeName: 'Svenska' },
  { code: 'nb', slug: 'nb', flag: 'no', nativeName: 'Norsk bokmål' },
  { code: 'fi', slug: 'fi', flag: 'fi', nativeName: 'Suomi' },
  { code: 'uk', slug: 'uk', flag: 'ua', nativeName: 'Українська' },
  { code: 'ru', slug: 'ru', flag: 'ru', nativeName: 'Русский' },
  { code: 'tr', slug: 'tr', flag: 'tr', nativeName: 'Türkçe' },
  { code: 'he', slug: 'he', flag: 'he', nativeName: 'עברית' },
  { code: 'eg', slug: 'eg', flag: 'eg', nativeName: 'العربية' },
  { code: 'at', slug: 'at', flag: 'at', nativeName: 'العربية' },
  { code: 'ps', slug: 'ps', flag: 'ps', nativeName: 'العربية' },
  { code: 'ma', slug: 'ma', flag: 'ma', nativeName: 'العربية' },
  { code: 'dz', slug: 'dz', flag: 'dz', nativeName: 'العربية' },
  { code: 'ka', slug: 'ka', flag: 'ka', nativeName: 'ქართული' },
  { code: 'hy', slug: 'hy', flag: 'hy', nativeName: 'Հայերեն' },
  { code: 'az', slug: 'az', flag: 'az', nativeName: 'Azərbaycan' },
  { code: 'zh', slug: 'zh', flag: 'cn', nativeName: '中文' },
  { code: 'ja', slug: 'ja', flag: 'jp', nativeName: '日本語' },
]

export const LOCALE_REGISTRY: readonly LocaleMeta[] = LOCALE_GRID

export const SUPPORTED_LOCALES = LOCALE_REGISTRY.map((l) => l.code) as readonly string[]

export type Locale = (typeof LOCALE_REGISTRY)[number]['code']

export const DEFAULT_LOCALE: Locale = 'nl'

const byCode = new Map(LOCALE_REGISTRY.map((l) => [l.code, l]))
const bySlug = new Map(LOCALE_REGISTRY.map((l) => [l.slug, l]))

export function getLocaleMeta(code: string): LocaleMeta | undefined {
  return byCode.get(code)
}

export function getLocaleFlag(code: string): string {
  return getLocaleMeta(code)?.flag ?? code
}

export function getLocaleNativeName(code: string): string {
  return getLocaleMeta(code)?.nativeName ?? code
}

export function getLocaleSlug(code: string): string {
  return getLocaleMeta(code)?.slug ?? code
}

export function localeFromSlug(slug: string | null | undefined): Locale | null {
  const s = String(slug ?? '').trim().toLowerCase()
  if (!s) return null
  const meta = bySlug.get(s)
  return meta ? (meta.code as Locale) : null
}

export function isLocaleSlug(segment: string): boolean {
  return localeFromSlug(segment) != null
}

export function isLocale(value: string | null | undefined): value is Locale {
  return Boolean(value) && byCode.has(String(value))
}
