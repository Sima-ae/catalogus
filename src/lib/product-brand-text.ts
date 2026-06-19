import {
  cleanImportDescription,
  sanitizeProductName,
  stripTitleDecorations,
} from '@/lib/yupoo/import-text'
import {
  finalizeYupooProductTitle,
  titleNeedsCjkCleanup,
} from '@/lib/yupoo/product-title'

/** Letters and digits only — for obfuscated brand matching (VERSAC*E → versace). */
export function lettersOnlyBrandKey(text: string): string {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function uniqueBrandNames(brandNames: string[], priorityBrand?: string | null): string[] {
  const seen = new Set<string>()
  const out: string[] = []

  const add = (name: string | null | undefined) => {
    const trimmed = String(name ?? '').trim()
    if (!trimmed) return
    const key = lettersOnlyBrandKey(trimmed)
    if (!key || seen.has(key)) return
    seen.add(key)
    out.push(trimmed)
  }

  add(priorityBrand)
  for (const name of brandNames) add(name)

  return out.sort((a, b) => lettersOnlyBrandKey(b).length - lettersOnlyBrandKey(a).length)
}

function isSeparatorToken(token: string): boolean {
  return !/[a-zA-Z0-9]/.test(token)
}

function tokenizeForBrandMatch(text: string): string[] {
  return text.match(/\S+/g) ?? []
}

function lettersFromTokens(tokens: string[]): string {
  return lettersOnlyBrandKey(tokens.filter((t) => !isSeparatorToken(t)).join(''))
}

function maxBrandTokenSpan(canonical: string): number {
  const words = canonical.trim().split(/\s+/).filter(Boolean).length
  return Math.max(words + 3, 4)
}

/**
 * Replace Yupoo-style obfuscated brand spellings (VERSAC E, VERSAC*E, etc.)
 * with canonical brand names from the catalog.
 */
export function fixBrandNamesInText(text: string, brandNames: string[], priorityBrand?: string | null): string {
  const raw = String(text ?? '')
  if (!raw.trim()) return raw

  const brands = uniqueBrandNames(brandNames, priorityBrand)
  if (!brands.length) return raw

  const tokens = tokenizeForBrandMatch(raw)
  if (!tokens.length) return raw

  const out: string[] = []
  let i = 0
  let changed = false

  while (i < tokens.length) {
    let matched = false

    for (const canonical of brands) {
      const key = lettersOnlyBrandKey(canonical)
      if (key.length < 3) continue

      const maxSpan = Math.min(tokens.length - i, maxBrandTokenSpan(canonical))
      for (let span = maxSpan; span >= 1; span--) {
        const chunk = tokens.slice(i, i + span)
        if (chunk.some(isSeparatorToken)) continue
        if (lettersFromTokens(chunk) !== key) continue
        if (chunk.join(' ').toUpperCase() === canonical.toUpperCase()) {
          out.push(...chunk)
        } else {
          out.push(canonical)
          changed = true
        }
        i += span
        matched = true
        break
      }
      if (matched) break
    }

    if (!matched) {
      out.push(tokens[i])
      i++
    }
  }

  if (!changed) return raw
  return out.join(' ')
}

export type PolishProductDisplayTextInput = {
  name: string
  description?: string
  short_description?: string | null
  brand?: string | null
  brandNames: string[]
}

/** Sync cleanup for shop display — brand names, decorations, description boilerplate. */
export function polishProductDisplayText(input: PolishProductDisplayTextInput): {
  name: string
  description: string
  short_description: string
} {
  const brand = input.brand?.trim() || null
  const brandNames = input.brandNames

  let name = sanitizeProductName(String(input.name ?? '').trim())
  name = stripTitleDecorations(name)
  name = fixBrandNamesInText(name, brandNames, brand)

  const rawDescription = input.description != null ? String(input.description) : ''
  const rawShort =
    input.short_description != null && input.short_description !== ''
      ? String(input.short_description)
      : ''

  const description = rawDescription
    ? fixBrandNamesInText(
        cleanImportDescription(rawDescription, name, brand),
        brandNames,
        brand
      )
    : rawDescription

  const short_description = rawShort
    ? fixBrandNamesInText(
        cleanImportDescription(rawShort, name, brand),
        brandNames,
        brand
      )
    : description

  return { name, description, short_description }
}

/** Full title polish for storage — includes CJK → English when needed. */
export async function polishProductTitleForStorage(
  name: string,
  brandNames: string[],
  brand?: string | null
): Promise<string> {
  const sync = polishProductDisplayText({
    name,
    brandNames,
    brand,
  }).name

  if (!titleNeedsCjkCleanup(sync)) return sync

  let translated = await finalizeYupooProductTitle(sync)
  translated = fixBrandNamesInText(translated, brandNames, brand)
  return sanitizeProductName(translated)
}

export async function polishProductTextForStorage(
  input: PolishProductDisplayTextInput
): Promise<{ name: string; description: string; short_description: string }> {
  const name = await polishProductTitleForStorage(input.name, input.brandNames, input.brand)
  const polished = polishProductDisplayText({
    ...input,
    name,
  })
  return polished
}
