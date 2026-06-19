/** Map common supplier number substitutions before brand fuzzy matching. */
const HOMOGLYPHS: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '2': 'z',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '6': 'g',
  '8': 'b',
}

/**
 * Letter-only brand key with homoglyphs (L0UIS → louis).
 * Used for exact and fuzzy brand matching in titles/descriptions.
 */
export function normalizeBrandMatchKey(text: string): string {
  let s = String(text ?? '').toLowerCase()
  s = s.replace(/[0-8]/g, (ch) => HOMOGLYPHS[ch] ?? ch)
  return s.replace(/[^a-z]/g, '')
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const prev = new Array<number>(b.length + 1)
  const curr = new Array<number>(b.length + 1)

  for (let j = 0; j <= b.length; j++) prev[j] = j

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]
  }

  return prev[b.length]
}

export function maxBrandEditDistance(keyLength: number): number {
  if (keyLength < 4) return 0
  if (keyLength <= 6) return 1
  if (keyLength <= 12) return 2
  return 3
}

export function fuzzyBrandKeysMatch(
  chunkKey: string,
  brandKey: string,
  opts?: { priority?: boolean }
): boolean {
  if (!chunkKey || !brandKey || chunkKey === brandKey) return chunkKey === brandKey
  if (chunkKey.length < 4 || brandKey.length < 4) return false

  const longer = Math.max(chunkKey.length, brandKey.length)
  const distance = levenshtein(chunkKey, brandKey)
  const maxDistance = maxBrandEditDistance(longer) + (opts?.priority ? 1 : 0)
  if (distance > maxDistance) return false
  if (distance / longer > (opts?.priority ? 0.25 : 0.22)) return false

  const prefixLen = Math.min(3, brandKey.length, chunkKey.length)
  return chunkKey.slice(0, prefixLen) === brandKey.slice(0, prefixLen)
}

/** Hand-tuned typo keys that fuzzy matching might miss or confuse. */
export const BRAND_TYPO_KEY_ALIASES: Record<string, string> = {
  philippplien: 'PHILIPP PLEIN',
  philipplein: 'PHILIPP PLEIN',
  louisvuiton: 'LOUIS VUITTON',
  louisvuittonn: 'LOUIS VUITTON',
  guccci: 'GUCCI',
  balenciagga: 'BALENCIAGA',
  bottegaveneta: 'BOTTEGA VENETA',
  dolcegabbana: 'DOLCE & GABBANA',
  dolceandgabbana: 'DOLCE & GABBANA',
}

export function canonicalBrandForTypoKey(
  chunkKey: string,
  brandNames: string[],
  priorityBrand?: string | null
): string | null {
  const alias = BRAND_TYPO_KEY_ALIASES[chunkKey]
  if (alias) {
    const exact = brandNames.find((b) => normalizeBrandMatchKey(b) === normalizeBrandMatchKey(alias))
    return exact ?? alias
  }

  const priorityKey = priorityBrand ? normalizeBrandMatchKey(priorityBrand) : ''
  if (priorityKey && fuzzyBrandKeysMatch(chunkKey, priorityKey, { priority: true })) {
    return priorityBrand!.trim()
  }

  type Candidate = { canonical: string; distance: number }
  let best: Candidate | null = null
  let second = Number.POSITIVE_INFINITY

  for (const canonical of brandNames) {
    const brandKey = normalizeBrandMatchKey(canonical)
    if (brandKey.length < 4) continue
    if (!fuzzyBrandKeysMatch(chunkKey, brandKey)) continue

    const distance = levenshtein(chunkKey, brandKey)
    if (!best || distance < best.distance) {
      second = best?.distance ?? Number.POSITIVE_INFINITY
      best = { canonical, distance }
      continue
    }
    if (distance < second) second = distance
  }

  if (!best || best.distance === 0) return null
  if (best.distance > 1 && second <= best.distance) return null
  return best.canonical
}
