/** Free Google Translate (no API key). Rate-limit calls in batch jobs. */

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function translateText(
  text: string,
  from = 'auto',
  to = 'en'
): Promise<string> {
  const trimmed = text.trim()
  if (!trimmed) return ''

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(trimmed)}`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Catalogus/1.0)' },
  })

  if (!res.ok) {
    throw new Error(`Translation HTTP ${res.status}`)
  }

  const data = (await res.json()) as unknown
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    return trimmed
  }

  return (data[0] as unknown[][])
    .map((chunk) => (Array.isArray(chunk) ? String(chunk[0] ?? '') : ''))
    .join('')
    .trim()
}

export type TranslatedProductText = {
  rawTitle: string
  rawDescription: string
  enTitle: string
  enDescription: string
  translationFailed: boolean
}

export async function translateProductText(
  title: string,
  description: string,
  delayMs = 400
): Promise<TranslatedProductText> {
  const rawTitle = title.trim()
  const rawDescription = description.trim()
  let enTitle = rawTitle
  let enDescription = rawDescription
  let translationFailed = false

  try {
    // Product names come from the raw Yupoo album title (sanitized) — not machine translation.
    // Translating full CN titles often yields shop taglines like "Southern PK wholesale…".
    if (rawDescription) {
      enDescription = await translateText(rawDescription)
    }
  } catch {
    translationFailed = true
    enTitle = rawTitle
    enDescription = rawDescription
  }

  return {
    rawTitle,
    rawDescription,
    enTitle: enTitle || rawTitle,
    enDescription: enDescription || rawDescription,
    translationFailed,
  }
}
