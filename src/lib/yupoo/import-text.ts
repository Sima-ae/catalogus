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

const YUPOO_SHOP_TAGLINE_RE =
  /(?:厂家直销|批发|免费代发|南方\s*pk|又拍|yupoo|supplier\s+product\s+catalog|factory\s+direct|wholesale|free\s+shipping|dropship|丽忆服饰|liyi\s+clothing)/i

/** Yupoo store header / footer text — not a product name. */
export function isYupooShopTagline(text: string): boolean {
  const t = String(text ?? '').trim()
  if (!t) return false
  if (YUPOO_SHOP_TAGLINE_RE.test(t)) return true
  if (/^southern\s+pk\b/i.test(t)) return true
  if (/^guanhui\s+foreign\s+trade$/i.test(t)) return true
  if (t === '冠汇外贸') return true
  if (/^liyi\s+clothing$/i.test(t)) return true
  if (t === '丽忆服饰') return true
  if (
    /^(wholesale|factory|free shipping|dropshipping)\b/i.test(t) &&
    !/\b(jordan|nike|adidas|dunk|yeezy|air max|kobe|samba|gazelle)\b/i.test(t)
  ) {
    return true
  }
  return false
}

/** Placeholder names that must never be stored as product titles. */
export function isPlaceholderProductTitle(name: string): boolean {
  const t = String(name ?? '').trim().toLowerCase()
  return !t || t === 'imported product' || t === 'untitled' || t === 'untitled product'
}

/** Emoji, icons, and decorative symbols — not allowed in product titles. */
const TITLE_DECORATION_RE =
  /(?:[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u26FF]|[\u2700-\u27BF]|[\uFE00-\uFE0F]|\u200D|\u20E3)/g

const TITLE_LEGACY_DECORATION_RE = /[\u24B6-\u24FF\u32A0-\u33FF]/g

/** Remove emoji, icons, and decorative punctuation from product titles. */
export function stripTitleDecorations(text: string, options?: { preserveHan?: boolean }): string {
  let t = String(text ?? '').trim()
  if (!t) return ''

  t = t.replace(TITLE_DECORATION_RE, '').replace(TITLE_LEGACY_DECORATION_RE, '')
  t = t.replace(/[「『]/g, '"').replace(/[」''』]/g, '"')
  t = t.replace(/[—–]/g, '-')
  t = t.replace(/[\u3000-\u303f\uff00-\uffef]/g, ' ')
  const disallowed = options?.preserveHan
    ? /[^a-zA-Z0-9\s"'.-\u4e00-\u9fff]/g
    : /[^a-zA-Z0-9\s"'.-]/g
  t = t.replace(disallowed, ' ')
  t = t.replace(/\s+/g, ' ').trim()
  return t
}

/** Strip Yupoo metadata (CN/EN); keeps Chinese for later translation in finalizeYupooProductTitle. */
export function sanitizeYupooAlbumTitle(text: string): string {
  let t = String(text ?? '').trim()
  if (!t || isPlaceholderProductTitle(t)) return ''

  if (isYupooShopTagline(t)) return ''

  for (const re of [YUPOO_TITLE_META_RE, YUPOO_TITLE_SKU_LABEL_RE]) {
    const idx = t.search(re)
    if (idx > 0) t = t.slice(0, idx).trim()
  }

  t = t.replace(/\s+\d{2}(?:\.\d)?(?:\s+\d{2}(?:\.\d)?){2,}.*$/, '').trim()

  if (isYupooShopTagline(t)) return ''

  t = stripGuanhuiForeignTrade(t)

  return t.length > 120 ? t.slice(0, 120).trim() : t
}

function isUsableDisplayTitle(title: string): boolean {
  const t = title.trim()
  if (t.length < 3) return false
  if (isPlaceholderProductTitle(t)) return false
  if (isYupooShopTagline(t)) return false
  if (isSkuOnlyTitle(t)) return true
  return /[a-zA-Z]{2,}/.test(t) || /[\u4e00-\u9fff]{2,}/.test(t)
}

function fallbackProductTitle(options: {
  fallbackSku?: string | null
  fallbackAlbumId?: string | null
}): string {
  const fromSku = extractYupooStyleCode(String(options.fallbackSku ?? ''))
  if (fromSku) return fromSku
  const albumId = String(options.fallbackAlbumId ?? '').trim()
  if (albumId) return albumId
  return 'Product'
}

/**
 * Product name from Yupoo album — descriptive title when available (e.g. Air Jordan 14 "GymRed"),
 * otherwise numeric style code for SKU-only albums. Never returns "Imported product".
 */
export function resolveYupooProductTitle(options: {
  albumTitle: string
  description?: string
  thumbTitle?: string | null
  fallbackSku?: string | null
  fallbackAlbumId?: string | null
}): string {
  const description = String(options.description ?? '').trim()
  const firstDescLine = description.split(/\r?\n/)[0]?.trim() ?? ''

  const descriptiveCandidates = [
    options.albumTitle,
    options.thumbTitle,
    firstDescLine,
  ]

  for (const candidate of descriptiveCandidates) {
    const raw = String(candidate ?? '').trim()
    if (!raw || isYupooShopTagline(raw) || isPlaceholderProductTitle(raw)) continue
    const sanitized = sanitizeYupooAlbumTitle(raw)
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
    const raw = String(candidate ?? '').trim()
    if (!raw || isPlaceholderProductTitle(raw) || isYupooShopTagline(raw)) continue
    const sanitized = sanitizeYupooAlbumTitle(raw)
    if (sanitized.length >= 3 && !isPlaceholderProductTitle(sanitized)) return sanitized
  }

  return fallbackProductTitle(options)
}

/** Remove leading SKU / numeric prefix already shown as the product name. */
export function stripDuplicateSkuPrefix(text: string, title: string): string {
  let result = String(text ?? '').trim()
  const titleTrim = String(title ?? '').trim()
  if (!result || !titleTrim) return result

  if (
    isSkuOnlyTitle(titleTrim) &&
    result.toLowerCase().startsWith(titleTrim.toLowerCase())
  ) {
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
  '顶级版本',
  '顶级原装',
  '真猫眼',
  '顶配',
  '最高版本',
] as const

/** Remove Yupoo seller marketing Chinese from product titles (keep color/model han for translation). */
export function stripChineseMarketingFromTitle(text: string): string {
  let result = String(text ?? '')
  for (const phrase of CN_MARKETING_PHRASES) {
    result = result.replace(new RegExp(escapeRegExp(phrase), 'g'), ' ')
  }
  return result.replace(/\s+/g, ' ').trim()
}

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

function isMostlyChineseLine(line: string): boolean {
  const t = line.trim()
  if (!t) return true
  if (isChineseLabelOnlyLine(t)) return true
  const cjk = (t.match(/[\u4e00-\u9fff]/g) || []).length
  const latin = (t.match(/[a-zA-Z]/g) || []).length
  if (cjk > 0 && latin === 0) return true
  if (cjk >= 4 && latin < 8) return true
  return false
}

/** Remove Han script from a line but keep Latin product copy on the same line. */
function stripCjkFromLine(line: string): string {
  return line
    .replace(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+/g, ' ')
    .replace(/[：；，。【】！？「」『』【】（）]/g, ' ')
    .replace(/\(\s*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanDescriptionLine(line: string): string {
  const t = line.trim()
  if (!t) return ''
  if (isSupplierOnlyLine(t)) return ''
  if (isChineseLabelOnlyLine(t)) return ''

  const cjk = (t.match(/[\u4e00-\u9fff]/g) || []).length
  const latin = (t.match(/[a-zA-Z]/g) || []).length
  if (cjk > 0 && latin === 0) return ''
  if (cjk > 0) return stripCjkFromLine(t)
  return t
}

function isSupplierOnlyLine(line: string): boolean {
  const t = line.trim()
  if (!t) return true
  if (/supplier\s+product\s+catalog/i.test(t) && t.length < 200) return true
  if (/^guang(?:zhou)?\s+keshi\b/i.test(t)) return true
  if (/^guangtai\b/i.test(t) && t.length < 120) return true
  if (/^guanhui\s+foreign\s+trade$/i.test(t)) return true
  if (/^冠汇外贸$/.test(t)) return true
  if (/^liyi\s+clothing$/i.test(t)) return true
  if (/^丽忆服饰$/.test(t)) return true
  if (/^(?:yangli|niuli|quanniuli|quanyangli)\b/i.test(t) && t.length < 80) return true
  return false
}

function isSupplierParenLabel(inner: string, brandName?: string | null): boolean {
  const label = inner.trim()
  if (!label) return false
  const brand = String(brandName ?? '').trim()
  if (brand && label.toLowerCase() === brand.toLowerCase()) return false
  if (/[\u4e00-\u9fff]/.test(label)) return true
  if (/yangli|niuli|guangtai|keshi|guangzhou|quanyangli|quanniuli|gjiaquan|southern\s*pk|liyi\s*clothing/i.test(label)) return true
  if (/official\s+website|1\s*:\s*1|high[- ]?end|high[- ]?quality/i.test(label)) return true
  return false
}

/**
 * Remove Chinese supplier shop lines/names from descriptions.
 * Keeps English product copy and brand names — never wipes the whole text unless
 * the source was supplier-only boilerplate.
 */
export function stripSupplierBoilerplateFromDescription(
  text: string,
  brandName?: string | null
): string {
  const original = String(text ?? '').trim()
  if (!original) return original

  if (
    /^guangzhou\s+keshi\s+clothing[\s\S]{0,240}$/i.test(original) &&
    /supplier\s+product\s+catalog/i.test(original)
  ) {
    return ''
  }

  let result = original
  result = result.replace(/\s*[-–—|｜]+\s*Supplier\s+Product\s+Catalog\s*$/gi, '')
  result = result.replace(
    /guangzhou\s+keshi\s+clothing(?:\s*\[[^\]]*\])?(?:\s*[-–—|｜]\s*)?(?:supplier\s+product\s+catalog)?/gi,
    ''
  )
  result = result.replace(
    /\[(?:exclusive\s+cross-border\s+supply,\s*affordable\s+and\s+transparent)\]/gi,
    ''
  )

  const lines = result.split(/\r?\n/)
  const kept = lines
    .map((line) => cleanDescriptionLine(line))
    .filter((line) => line.length > 0)

  result = kept.length > 0 ? kept.join('\n') : cleanDescriptionLine(result)

  result = result.replace(
    /^\(([^)]+)\)\s*/i,
    (match, inner: string) => (isSupplierParenLabel(inner, brandName) ? '' : match)
  )
  result = result.replace(/\(\s*high[- ]?end\s+niuli\s*\)/gi, ' ')
  result = result.replace(/\(\s*high[- ]?end\s+yangli\s*\)/gi, ' ')
  result = result.replace(/\(\s*[\u4e00-\u9fff]{1,12}\s*\)/g, ' ')
  result = result.replace(/^high[- ]?quality\s+niuli\s+/i, '')
  result = result.replace(/^(?:yangli|niuli|guangtai|quanniuli|quanyangli|gjiaquan)\s+/i, '')
  result = result.replace(/^southern\s+pk\b[:\s-]*/i, '')

  result = result
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^[|｜\-–—:：,，.\s]+/, '')
    .replace(/[|｜\-–—:：,，.\s]+$/, '')
    .trim()

  return result
}

/** Remove Yupoo supplier shop label "Guanhui foreign trade" (EN + CN). */
export function stripGuanhuiForeignTrade(text: string): string {
  let result = String(text ?? '')
  if (!result.trim()) return result

  result = result.replace(/\bGuanhui\s+foreign\s+trade\b/gi, ' ')
  result = result.replace(/冠汇外贸/g, ' ')
  result = result.replace(/\(\s*Guanhui\s+foreign\s+trade\s*\)/gi, ' ')
  result = result.replace(/\(\s*冠汇外贸\s*\)/g, ' ')

  result = result
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^guanhui\s+foreign\s+trade$/i.test(line) && line !== '冠汇外贸')
    .join('\n')

  result = result
    .replace(/\s*[-–—|｜]\s*[-–—|｜]\s*/g, ' ')
    .replace(/^[|｜\-–—:：,，.\s]+/, '')
    .replace(/[|｜\-–—:：,，.\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()

  return result
}

/** Remove supplier label "Imported Yangjing fabric" from descriptions. */
export function stripImportedYangjingFabric(text: string): string {
  let result = String(text ?? '')
  if (!result.trim()) return result

  result = result.replace(/\bImported\s+Yangjing\s+fabric\b/gi, ' ')
  result = result.replace(/\(\s*Imported\s+Yangjing\s+fabric\s*\)/gi, ' ')

  result = result
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^imported\s+yangjing\s+fabric\b/i.test(line))
    .join('\n')

  result = result
    .replace(/\s*[-–—|｜]\s*[-–—|｜]\s*/g, ' ')
    .replace(/^[|｜\-–—:：,，.\s]+/, '')
    .replace(/[|｜\-–—:：,，.\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()

  return result
}

/** Remove Yupoo supplier shop label "Xiao Ao" from descriptions. */
export function stripXiaoAo(text: string): string {
  let result = String(text ?? '')
  if (!result.trim()) return result

  result = result.replace(/\bXiao\s*Ao\b/gi, ' ')
  result = result.replace(/\(\s*Xiao\s*Ao\s*\)/gi, ' ')

  result = result
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^xiao\s*ao\b/i.test(line))
    .join('\n')

  result = result
    .replace(/\s*[-–—|｜]\s*[-–—|｜]\s*/g, ' ')
    .replace(/^[|｜\-–—:：,，.\s]+/, '')
    .replace(/[|｜\-–—:：,，.\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()

  return result
}

/** Remove Yupoo supplier shop label "Gjiaquan" from descriptions. */
export function stripGjiaquan(text: string): string {
  let result = String(text ?? '')
  if (!result.trim()) return result

  result = result.replace(/\bG\s*Jiaquan\b/gi, ' ')
  result = result.replace(/\bGjiaquan\b/gi, ' ')
  result = result.replace(/\(\s*Gjiaquan\s*\)/gi, ' ')
  result = result.replace(/\(\s*G\s*Jiaquan\s*\)/gi, ' ')

  result = result
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^gjiaquan\b/i.test(line))
    .join('\n')

  result = result
    .replace(/\s*[-–—|｜]\s*[-–—|｜]\s*/g, ' ')
    .replace(/^[|｜\-–—:：,，.\s]+/, '')
    .replace(/[|｜\-–—:：,，.\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()

  return result
}

/** Remove Yupoo supplier shop label "Liyi Clothing" / 丽忆服饰 from descriptions. */
export function stripLiyiClothing(text: string): string {
  let result = String(text ?? '')
  if (!result.trim()) return result

  result = result.replace(/\bLiyi\s+Clothing\b/gi, ' ')
  result = result.replace(/丽忆服饰/g, ' ')
  result = result.replace(/\(\s*Liyi\s+Clothing\s*\)/gi, ' ')
  result = result.replace(/\(\s*丽忆服饰\s*\)/g, ' ')

  result = result
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^liyi\s+clothing$/i.test(line) && line !== '丽忆服饰')
    .join('\n')

  result = result
    .replace(/\s*[-–—|｜]\s*[-–—|｜]\s*/g, ' ')
    .replace(/^[|｜\-–—:：,，.\s]+/, '')
    .replace(/[|｜\-–—:：,，.\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()

  return result
}

/** Remove supplier shop label from product titles (EN + CN). */
export function sanitizeProductName(name: string): string {
  const original = String(name ?? '').trim()
  if (!original) return original
  let result = stripGuanhuiForeignTrade(original)
  result = result
    .replace(/\s*[-–—|｜]\s*guanhui\s+foreign\s+trade\s*$/gi, '')
    .replace(/\s*[-–—|｜]\s*冠汇外贸\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!result) return original
  return result
}

/** Replace calendar years in copy (e.g. 2023, 2024, 2025) with the current catalog year. */
export function normalizeDescriptionYears(text: string, targetYear = '2026'): string {
  return String(text ?? '').replace(/\b(19|20)\d{2}\b/g, (year) =>
    year === targetYear ? year : targetYear
  )
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
  result = stripGjiaquan(result)
  result = stripXiaoAo(result)
  result = stripLiyiClothing(result)
  result = stripImportedYangjingFabric(result)
  result = stripSupplierBoilerplateFromDescription(result, brandName)
  result = stripGuanhuiForeignTrade(result)
  result = normalizeDescriptionYears(result)
  result = stripChineseIconsAndDecorations(result)
  result = result
    .replace(/\bshipping\s+from\s+guangzhou\b/gi, ' ')
    .replace(/\bfree\s+shipping\b/gi, ' ')
  return result.replace(/\s+/g, ' ').trim()
}

/** Normalize description fields on create/update and API responses. */
export function sanitizeProductDescriptions(
  name: string,
  description: string,
  shortDescription: string | null | undefined,
  brandName?: string | null
): { description: string; short_description: string | null } {
  const productName = String(name ?? '').trim()
  const cleanedDesc = cleanImportDescription(String(description ?? ''), productName, brandName)
  const rawShort = String(shortDescription ?? '').trim()
  const cleanedShort = rawShort
    ? cleanImportDescription(rawShort, productName, brandName)
    : ''
  return {
    description: cleanedDesc,
    short_description: cleanedShort || null,
  }
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
