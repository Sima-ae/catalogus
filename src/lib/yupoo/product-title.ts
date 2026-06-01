import { translateText } from '@/lib/translate'
import {
  isPlaceholderProductTitle,
  isYupooShopTagline,
  resolveYupooProductTitle,
  sanitizeYupooAlbumTitle,
  stripTitleDecorations,
} from '@/lib/yupoo/import-text'

export { stripTitleDecorations } from '@/lib/yupoo/import-text'

const HAN_SEGMENT_RE = /[\u4e00-\u9fff]+/

/** Translate Chinese runs in a title; leave Latin model names / color codes unchanged. */
export async function translateChineseSegmentsInTitle(text: string): Promise<string> {
  const trimmed = String(text ?? '').trim()
  if (!trimmed || !HAN_SEGMENT_RE.test(trimmed)) return trimmed

  const parts = trimmed.split(/([\u4e00-\u9fff]+)/)
  const out: string[] = []

  for (const part of parts) {
    if (!part) continue
    if (HAN_SEGMENT_RE.test(part)) {
      try {
        const en = await translateText(part, 'zh-CN', 'en')
        if (en.trim()) out.push(en.trim())
      } catch {
        /* drop untranslatable han */
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
  t = await translateChineseSegmentsInTitle(t)
  t = stripTitleDecorations(t)
  t = t.replace(/[\u4e00-\u9fff]+/g, ' ').replace(/\s+/g, ' ').trim()

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
  if (!HAN_SEGMENT_RE.test(base) && base === stripTitleDecorations(base)) return base
  return finalizeYupooProductTitle(base)
}
