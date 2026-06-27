import { SUPPORTED_LOCALES } from '@/lib/i18n-locale-registry'

const localeSet = new Set<string>(SUPPORTED_LOCALES)

export type TickerTranslations = Record<string, string>

export type TickerMessagePublic = {
  id: number
  sortOrder: number
  text: string
}

export function parseTickerTranslations(raw: unknown): TickerTranslations {
  if (raw == null) return {}
  if (typeof raw === 'string') {
    try {
      return normalizeTickerTranslations(JSON.parse(raw))
    } catch {
      return {}
    }
  }
  return normalizeTickerTranslations(raw)
}

export function normalizeTickerTranslations(raw: unknown): TickerTranslations {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: TickerTranslations = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!localeSet.has(k)) continue
    if (typeof v !== 'string') continue
    const t = v.trim()
    if (t) out[k] = t.slice(0, 600)
  }
  return out
}

/** Pick best available line for the active UI locale. */
export function resolveTickerLine(translations: TickerTranslations, locale: string): string {
  const loc = translations[locale]?.trim()
  if (loc) return loc
  const en = translations.en?.trim()
  if (en) return en
  const nl = translations.nl?.trim()
  if (nl) return nl
  for (const code of SUPPORTED_LOCALES) {
    const t = translations[code]?.trim()
    if (t) return t
  }
  return ''
}

export function hasAnyTickerText(translations: TickerTranslations): boolean {
  return Object.values(translations).some((s) => typeof s === 'string' && s.trim().length > 0)
}
