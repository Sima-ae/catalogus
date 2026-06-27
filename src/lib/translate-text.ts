import { sanitizeTranslationMarkup } from '@/lib/category-i18n-key'
import type { Locale } from '@/lib/i18n-locale-registry'

/** Map app locale codes to DeepL / MyMemory target language codes. */
const LOCALE_TO_TRANSLATE_TARGET: Partial<Record<Locale, string>> = {
  en: 'EN',
  nl: 'NL',
  de: 'DE',
  fr: 'FR',
  es: 'ES',
  pt: 'PT',
  it: 'IT',
  pl: 'PL',
  ru: 'RU',
  uk: 'UK',
  ja: 'JA',
  zh: 'ZH',
  tr: 'TR',
  da: 'DA',
  fi: 'FI',
  nb: 'NB',
  sv: 'SV',
  ro: 'RO',
  hu: 'HU',
  bg: 'BG',
  cs: 'CS',
  sk: 'SK',
  sl: 'SL',
  hr: 'HR',
  sr: 'SR',
  lt: 'LT',
  lv: 'LV',
  et: 'ET',
  el: 'EL',
  he: 'HE',
  ar: 'AR',
  hy: 'HY',
  ka: 'KA',
  az: 'AZ',
  mk: 'MK',
  sq: 'SQ',
  bs: 'BS',
  me: 'SR',
  ba: 'BS',
  gr: 'EL',
  cz: 'CS',
  eg: 'AR',
  at: 'AR',
  ps: 'AR',
  ma: 'AR',
  dz: 'AR',
}

function myMemoryLang(locale: Locale): string {
  const mapped = LOCALE_TO_TRANSLATE_TARGET[locale]
  if (mapped) return mapped.toLowerCase()
  return locale.slice(0, 2).toLowerCase()
}

async function translateWithDeepL(text: string, targetLocale: Locale): Promise<string | null> {
  const apiKey = process.env.DEEPL_API_KEY?.trim() || process.env.DEEPL_AUTH_KEY?.trim()
  if (!apiKey) return null

  const target = LOCALE_TO_TRANSLATE_TARGET[targetLocale]
  if (!target) return null

  const baseUrl = apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : process.env.DEEPL_API_URL?.trim() || 'https://api.deepl.com/v2/translate'

  try {
    const body = new URLSearchParams({
      text,
      source_lang: 'EN',
      target_lang: target,
    })
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { translations?: { text?: string }[] }
    const translated = data.translations?.[0]?.text?.trim()
    return translated || null
  } catch {
    return null
  }
}

async function translateWithMyMemory(text: string, targetLocale: Locale): Promise<string | null> {
  const target = myMemoryLang(targetLocale)
  if (target === 'en') return text

  try {
    const url = new URL('https://api.mymemory.translated.net/get')
    url.searchParams.set('q', text)
    url.searchParams.set('langpair', `en|${target}`)
    const res = await fetch(url.toString(), { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as {
      responseStatus?: number
      responseData?: { translatedText?: string }
    }
    if (data.responseStatus && data.responseStatus !== 200) return null
    const translated = data.responseData?.translatedText?.trim()
    if (!translated || translated.toUpperCase() === text.toUpperCase()) return translated || null
    return translated
  } catch {
    return null
  }
}

/** Translate English catalog text into a shop locale (DeepL when configured, else MyMemory). */
export async function translateFromEnglish(
  text: string,
  targetLocale: Locale
): Promise<string> {
  const source = String(text ?? '').trim()
  if (!source) return ''
  if (targetLocale === 'en') return source

  const deepl = await translateWithDeepL(source, targetLocale)
  if (deepl) return sanitizeTranslationMarkup(deepl)

  const memory = await translateWithMyMemory(source, targetLocale)
  if (memory) return sanitizeTranslationMarkup(memory)

  return source
}
