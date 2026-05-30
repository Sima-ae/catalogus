/** Yupoo albums often use a numeric SKU as the title; descriptions repeat it. */

export function isSkuOnlyTitle(title: string): boolean {
  const t = title.trim()
  if (!t) return false
  return /^\d{5,}[a-zA-Z]?$/.test(t.replace(/\s+/g, ''))
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
  let result = stripDuplicateSkuPrefix(text, title)
  result = stripProductTrademarkBoilerplate(result, brandName)
  return result.replace(/\s+/g, ' ').trim()
}

function firstMeaningfulDescriptionLine(cleaned: string): string {
  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  for (const line of lines) {
    if (/^Product\s+trademark\s*[：:]/i.test(line)) continue
    if (/^[\u4e00-\u9fff]{2,6}\s*[：:]/.test(line) && /商标/.test(line)) continue
    if (line.length >= 12) return line
  }

  return lines[0] || cleaned
}

/** Prefer a readable title when Yupoo only provides a style code. */
export function deriveImportProductName(
  title: string,
  description: string,
  brandName: string | null
): string {
  const rawTitle = title.trim()
  if (!isSkuOnlyTitle(rawTitle)) {
    return rawTitle || 'Imported product'
  }

  const cleaned = cleanImportDescription(description, rawTitle, brandName)
  const snippet = firstMeaningfulDescriptionLine(cleaned)
    .replace(/\s+/g, ' ')
    .slice(0, 120)
    .trim()

  if (snippet.length >= 12) return snippet
  if (brandName) return brandName
  return rawTitle
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
