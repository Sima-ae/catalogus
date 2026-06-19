import { translateText, sleep } from '@/lib/translate'
import {
  isPlaceholderProductTitle,
  isYupooShopTagline,
  resolveYupooProductTitle,
  sanitizeYupooAlbumTitle,
  stripChineseMarketingFromTitle,
  stripTitleDecorations,
  sanitizeProductName,
} from '@/lib/yupoo/import-text'

export { stripTitleDecorations } from '@/lib/yupoo/import-text'

const CJK_SEGMENT_RE = /[\u4e00-\u9fff\u3040-\u30ff\u31f0-\u31ff]+/

/** Title still has Chinese, Japanese kana, or decorative symbols — needs cleanup. */
export function titleNeedsEnglishCleanup(text: string): boolean {
  return titleNeedsCjkCleanup(text) || String(text ?? '').trim() !== stripTitleDecorations(text)
}

/** Title contains Chinese or Japanese characters. */
export function titleNeedsCjkCleanup(text: string): boolean {
  const t = String(text ?? '').trim()
  if (!t) return false
  return CJK_SEGMENT_RE.test(t)
}

/** Translate Chinese / Japanese runs in a title; leave Latin model names unchanged. */
export async function translateChineseSegmentsInTitle(text: string): Promise<string> {
  return translateCjkSegmentsInTitle(text)
}

/** Translate CJK runs in a title to English. */
export async function translateCjkSegmentsInTitle(text: string): Promise<string> {
  const trimmed = String(text ?? '').trim()
  if (!trimmed || !CJK_SEGMENT_RE.test(trimmed)) return trimmed

  const parts = trimmed.split(/([\u4e00-\u9fff\u3040-\u30ff\u31f0-\u31ff]+)/)
  const out: string[] = []

  for (const part of parts) {
    if (!part) continue
    if (CJK_SEGMENT_RE.test(part)) {
      try {
        const en = await translateText(part, 'auto', 'en')
        if (en.trim()) out.push(en.trim())
        await sleep(350)
      } catch {
        /* drop untranslatable segment */
      }
    } else {
      out.push(part)
    }
  }

  return out.map((s) => s.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

/** Strip icons/symbols and translate any Chinese — final shop product title. */
export async function finalizeYupooProductTitle(raw: string): Promise<string> {
  let t = sanitizeYupooAlbumTitle(raw)
  if (!t || isPlaceholderProductTitle(t) || isYupooShopTagline(t)) return t

  t = stripTitleDecorations(t, { preserveHan: true })
  t = stripChineseMarketingFromTitle(t)
  t = await translateCjkSegmentsInTitle(t)
  t = stripTitleDecorations(t)
  t = t.replace(/[\u4e00-\u9fff\u3040-\u30ff\u31f0-\u31ff]+/g, ' ').replace(/\s+/g, ' ').trim()
  t = sanitizeProductName(t)

  return t.length > 120 ? t.slice(0, 120).trim() : t
}

export async function resolveYupooProductTitleAsync(options: {
  albumTitle: string
  description?: string
  thumbTitle?: string | null
  fallbackSku?: string | null
  fallbackAlbumId?: string | null
}): Promise<string> {
  const base = resolveYupooProductTitle(options)
  if (isPlaceholderProductTitle(base) || isYupooShopTagline(base)) return base
  if (!CJK_SEGMENT_RE.test(base) && base === stripTitleDecorations(base)) return base
  return finalizeYupooProductTitle(base)
}
