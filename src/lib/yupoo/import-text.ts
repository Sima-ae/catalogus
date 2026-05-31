/** Yupoo albums often use a numeric SKU as the title; descriptions repeat it. */

export function isSkuOnlyTitle(title: string): boolean {
  const t = title.trim()
  if (!t) return false
  return /^\d{5,}[a-zA-Z]?$/.test(t.replace(/\s+/g, ''))
}

/** Yupoo style codes on category grids (e.g. 1308230, 1133260). */
export function extractYupooStyleCode(text: string): string | null {
  const t = String(text ?? '').trim()
  if (!t) return null
  if (isSkuOnlyTitle(t)) return t.replace(/\s+/g, '')
  const leading = t.match(/^(\d{5,}[a-zA-Z]?)/)
  if (leading?.[1] && isSkuOnlyTitle(leading[1])) return leading[1]
  const standalone = t.match(/(?:^|[\s,，|｜])(\d{5,}[a-zA-Z]?)(?:$|[\s,，|｜])/)
  if (standalone?.[1] && isSkuOnlyTitle(standalone[1])) return standalone[1]
  return null
}

const YUPOO_TITLE_META_RE =
  /\s*(?:货号|款号|型号|尺码|尺寸|颜色|colour|color|size|sizes|available\s+sizes?)\s*[：:]/i

const YUPOO_TITLE_SKU_LABEL_RE =
  /\s*(?:Style\s*(?:No\.?|#|code)?|Item\s*(?:No\.?|#)?|SKU\s*[：:#]?)\s*[：:]?\s*\S/i

/** Strip Yupoo metadata (CN/EN) and keep the product name portion. */
export function sanitizeYupooAlbumTitle(text: string): string {
  let t = String(text ?? '').trim()
  if (!t) return ''

  for (const re of [YUPOO_TITLE_META_RE, YUPOO_TITLE_SKU_LABEL_RE]) {
    const idx = t.search(re)
    if (idx > 0) t = t.slice(0, idx).trim()
  }

  t = t.replace(/[\u4e00-\u9fff].*$/, '').trim()
  t = t.replace(/\s+\d{2}(?:\.\d)?(?:\s+\d{2}(?:\.\d)?){2,}.*$/, '').trim()
  t = t.replace(/[""」』]/g, '"').replace(/[「『]/g, '"')
  t = t.replace(/\s+/g, ' ').trim()
  t = t.replace(/^[\s|｜\-–—:：,，.]+/, '').trim()
  t = t.replace(/[\s|｜\-–—:：,，.]+$/, '').trim()

  return t.length > 120 ? t.slice(0, 120).trim() : t
}

function isUsableDisplayTitle(title: string): boolean {
  const t = title.trim()
  if (t.length < 3) return false
  if (/^imported product$/i.test(t)) return false
  if (isSkuOnlyTitle(t)) return true
  return /[a-zA-Z]{2,}/.test(t)
}

/**
 * Product name from Yupoo album — descriptive title when available (e.g. Air Jordan 14 "GymRed"),
 * otherwise numeric style code for SKU-only albums.
 */
export function resolveYupooProductTitle(options: {
  albumTitle: string
  description?: string
  thumbTitle?: string | null
}): string {
  const description = String(options.description ?? '').trim()
  const firstDescLine = description.split(/\r?\n/)[0]?.trim() ?? ''

  const descriptiveCandidates = [
    options.albumTitle,
    options.thumbTitle,
    firstDescLine,
  ]

  for (const candidate of descriptiveCandidates) {
    const sanitized = sanitizeYupooAlbumTitle(String(candidate ?? ''))
    if (sanitized && isUsableDisplayTitle(sanitized) && !isSkuOnlyTitle(sanitized)) {
      return sanitized
    }
  }

  const numericCandidates = [
    options.thumbTitle,
    options.albumTitle,
    extractYupooStyleCode(options.albumTitle ?? ''),
    extractYupooStyleCode(firstDescLine),
    extractYupooStyleCode(description),
  ]

  for (const candidate of numericCandidates) {
    const value = String(candidate ?? '').trim()
    if (!value) continue
    if (isSkuOnlyTitle(value)) return value.replace(/\s+/g, '')
  }

  for (const candidate of numericCandidates) {
    const code = extractYupooStyleCode(String(candidate ?? ''))
    if (code) return code
  }

  for (const candidate of descriptiveCandidates) {
    const sanitized = sanitizeYupooAlbumTitle(String(candidate ?? ''))
    if (sanitized.length >= 3) return sanitized
  }

  return 'Imported product'
}

/** Remove leading SKU / numeric prefix already shown as the product name. */
export function stripDuplicateSkuPrefix(text: string, title: string): string {
  let result = String(text ?? '').trim()
  const titleTrim = String(title ?? '').trim()
  if (!result || !titleTrim) return result

  if (result.toLowerCase().startsWith(titleTrim.toLowerCase())) {
    result = result.slice(titleTrim.length).trim()
  }

  const titleDigits = titleTrim.match(/^(\d{5,})/)?.[1]
  if (titleDigits) {
    for (let len = titleDigits.length; len >= Math.min(5, titleDigits.length); len--) {
      const prefix = titleDigits.slice(0, len)
      if (result.startsWith(prefix)) {
        result = result.slice(prefix.length).trim()
        break
      }
    }
  }

  result = result.replace(/^[\u2600-\u27BF\uD800-\uDBFF\uDC00-\uDFFF\s]+/, '').trim()
  result = result.replace(/^[|｜\-–—:：,，.\s]+/, '').trim()
  return result
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Emoji + circled CJK buttons (🉑 🈶): supplementary planes via surrogates + BMP symbols.
 * (ES5-safe — no \u{...} escapes.)
 */
const DECORATIVE_UNICODE_RE =
  /(?:[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u26FF]|[\u2700-\u27BF]|[\uFE00-\uFE0F]|\u200D|\u20E3)/g

/** Older blocks: circled/squared CJK and compatibility forms. */
const LEGACY_CJK_DECORATION_RE = /[\u24B6-\u24FF\u32A0-\u33FF]/g

/** Common Yupoo CN marketing fragments (inline or standalone). */
const CN_MARKETING_PHRASES = [
  '专柜正品',
  '厂家直销',
  '高品质',
  '微信同款',
  '可查码',
  '包邮',
  '正品',
  '现货',
  '特价',
  '原单',
  '原版',
  '一比一',
  '超高品质',
  '顶级品质',
] as const

function stripInlineChineseNoise(text: string): string {
  let result = text
  for (const phrase of CN_MARKETING_PHRASES) {
    result = result.replace(new RegExp(escapeRegExp(phrase), 'gi'), ' ')
  }
  // Lone 1–3 character Han fragments (icon captions like 可 / 正) between word boundaries
  result = result.replace(/(^|[\s,，.;:：！!？?])[\u4e00-\u9fff]{1,3}(?=($|[\s,，.;:：！!？?]))/g, '$1')
  return result
}

/** Line is only short Chinese labels / symbols (not English product copy). */
function isChineseLabelOnlyLine(line: string): boolean {
  const stripped = line.replace(DECORATIVE_UNICODE_RE, '').replace(LEGACY_CJK_DECORATION_RE, '').trim()
  if (!stripped) return true
  if (/^(包邮|正品|现货|专柜|特价|微信|.taobao|taobao|商标|厂家|直销)/i.test(stripped)) return true
  if (
    /^[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\s·•‧|｜\-–—:：,，.、]+$/.test(stripped) &&
    stripped.length <= 16
  ) {
    return true
  }
  return false
}

/** Remove Chinese icon buttons, emoji, and short CN label lines from descriptions. */
export function stripChineseIconsAndDecorations(text: string): string {
  let result = String(text ?? '')

  result = result.replace(DECORATIVE_UNICODE_RE, '').replace(LEGACY_CJK_DECORATION_RE, '')

  const lines = result.split(/\r?\n/)
  if (lines.length > 1) {
    result = lines
      .map((line) => line.trim())
      .filter((line) => line && !isChineseLabelOnlyLine(line))
      .join('\n')
  } else {
    result = lines[0] ?? ''
  }

  result = stripInlineChineseNoise(result)

  result = result
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return result
}

/** Remove Yupoo "Product trademark: Brand" boilerplate (EN + CN). */
export function stripProductTrademarkBoilerplate(
  text: string,
  brandName?: string | null
): string {
  let result = String(text ?? '').trim()
  if (!result) return result

  const brand = String(brandName ?? '').trim()
  const brandEsc = brand ? escapeRegExp(brand) : ''

  const quotedBrandPrefix = (_match: string, label: string) => `"${label.trim()}" `

  // Product trademark: Ferragamo "Ferragamo" casual... → "Ferragamo" casual...
  result = result.replace(
    /^Product\s+trademark\s*[：:]\s*([^\s"']+)\s*["'「『"](\1)["'」』"]\s*/i,
    quotedBrandPrefix
  )
  result = result.replace(
    /^Product\s+trademark\s*[：:]\s*([^\s"']+)\s+\1\s*/i,
    quotedBrandPrefix
  )

  if (brandEsc) {
    const keepQuotedBrand = () => `"${brand}" `
    result = result.replace(
      new RegExp(
        `^Product\\s+trademark\\s*[：:]\\s*${brandEsc}\\s*["'「『"]${brandEsc}["'」』"]\\s*`,
        'i'
      ),
      keepQuotedBrand
    )
    result = result.replace(
      new RegExp(`^Product\\s+trademark\\s*[：:]\\s*${brandEsc}\\s+${brandEsc}\\s*`, 'i'),
      keepQuotedBrand
    )
    result = result.replace(
      new RegExp(`^Product\\s+trademark\\s*[：:]\\s*${brandEsc}\\s*`, 'i'),
      keepQuotedBrand
    )
  }

  result = result
    .replace(/^Product\s+trademark\s*[：:]\s*/i, '')
    .replace(/^Brand\s+trademark\s*[：:]\s*/i, '')
    .replace(/^Trademark\s*[：:]\s*/i, '')
    .replace(/^[\u4e00-\u9fff]{2,6}\s*[：:]\s*/, '')
    .trim()

  if (brandEsc) {
    result = result.replace(
      new RegExp(`^${brandEsc}\\s+${brandEsc}\\s+`, 'i'),
      `"${brand}" `
    )
  }

  result = result.replace(/^[|｜\-–—:：,，.\s]+/, '').trim()
  return result
}

/** SKU prefix + trademark boilerplate cleanup for import and shop display. */
export function cleanImportDescription(
  text: string,
  title: string,
  brandName?: string | null
): string {
  let result = stripChineseIconsAndDecorations(text)
  result = stripDuplicateSkuPrefix(result, title)
  result = stripProductTrademarkBoilerplate(result, brandName)
  result = stripChineseIconsAndDecorations(result)
  return result.replace(/\s+/g, ' ').trim()
}

/** @deprecated Use resolveYupooProductTitle — kept for callers passing only album fields. */
export function deriveImportProductName(
  title: string,
  description: string,
  _brandName: string | null,
  thumbTitle?: string | null
): string {
  return resolveYupooProductTitle({
    albumTitle: title,
    description,
    thumbTitle,
  })
}

/** Text for catalog cards — no repeat of the product name / SKU / trademark line. */
export function catalogCardDescription(
  name: string,
  description: string,
  shortDescription?: string | null,
  brandName?: string | null
): string {
  const base = String(shortDescription || description || '').trim()
  const cleaned = cleanImportDescription(base, name, brandName)
  if (!cleaned) return ''
  if (cleaned.toLowerCase() === name.trim().toLowerCase()) return ''
  if (brandName && cleaned.toLowerCase() === brandName.trim().toLowerCase()) return ''
  return cleaned
}
