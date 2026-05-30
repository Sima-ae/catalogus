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

  const cleaned = stripDuplicateSkuPrefix(description, rawTitle)
  const firstLine = cleaned.split(/\r?\n/)[0]?.trim() || cleaned
  const snippet = firstLine.replace(/\s+/g, ' ').slice(0, 120).trim()

  if (snippet.length >= 12) return snippet
  if (brandName) return brandName
  return rawTitle
}

/** Text for catalog cards — no repeat of the product name / SKU. */
export function catalogCardDescription(
  name: string,
  description: string,
  shortDescription?: string | null
): string {
  const base = String(shortDescription || description || '').trim()
  const cleaned = stripDuplicateSkuPrefix(base, name)
  if (!cleaned) return ''
  if (cleaned.toLowerCase() === name.trim().toLowerCase()) return ''
  return cleaned
}
