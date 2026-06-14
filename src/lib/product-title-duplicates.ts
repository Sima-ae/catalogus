const TITLE_STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'with',
  'for',
  'in',
  'on',
  'of',
  'to',
  'at',
  'by',
  'from',
  'is',
  'it',
  'as',
  'be',
  'are',
  'was',
  'were',
])

/** Generic catalog words — dropped for keyword fingerprinting. */
const GENERIC_CATALOG_WORDS = new Set([
  'watch',
  'watches',
  'mens',
  'men',
  'man',
  'womens',
  'women',
  'woman',
  'ladies',
  'lady',
  'unisex',
  'new',
  'pre',
  'owned',
  'used',
  'box',
  'papers',
  'card',
  'set',
  'full',
  'complete',
  'w',
  'wt',
  'dial',
  'steel',
  'gold',
  'rose',
  'silver',
  'black',
  'white',
  'blue',
  'green',
  'red',
  'grey',
  'gray',
  'brown',
  'yellow',
  'automatic',
  'quartz',
  'mechanical',
  'sapphire',
  'crystal',
  'ceramic',
  'titanium',
  'stainless',
  'bracelet',
  'strap',
  'band',
  'leather',
  'rubber',
  'nato',
  'luxury',
  'swiss',
  'geneva',
  'style',
  'design',
  'series',
  'collection',
  'edition',
  'size',
  'mm',
  'ref',
  'reference',
  'model',
  'year',
  'unworn',
  'mint',
  'condition',
  'authentic',
  'original',
  'premium',
  'quality',
  'classic',
  'sport',
  'sports',
  'dress',
  'casual',
  'water',
  'resistant',
  'resistance',
  'clasp',
  'buckle',
  'bezel',
  'case',
  'crown',
  'hands',
  'marker',
  'markers',
  'index',
  'indexes',
  'lume',
  'date',
  'day',
  'chronograph',
  'chrono',
  'gmt',
  'diver',
  'dive',
  'pilot',
  'racing',
  'limited',
  'special',
  'gen',
  'generation',
  'version',
  'type',
  'item',
  'product',
  'top',
  'best',
  'hot',
  'sale',
  'free',
  'shipping',
])

/** Distinctive model / nickname keywords (kept for grouping). */
export const WATCH_TITLE_NICKNAMES = new Set([
  'hulk',
  'kermit',
  'batman',
  'pepsi',
  'coke',
  'meteorite',
  'smurf',
  'starbucks',
  'rootbeer',
  'ghost',
  'newman',
  'sprite',
  'tiffany',
  'wimbledon',
  'snoopy',
  'moonwatch',
  'nautilus',
  'aquanaut',
  'pelagos',
  'daytona',
  'datejust',
  'submariner',
  'seadweller',
  'deepsea',
  'explorer',
  'milgauss',
  'yachtmaster',
  'skydweller',
  'gmtmaster',
  'daydate',
  'speedmaster',
  'seamaster',
  'constellation',
  'deville',
  'navitimer',
  'superocean',
  'chronomat',
  'avenger',
  'portofino',
  'carrera',
  'aquaracer',
  'luminor',
  'radiomir',
  'submersible',
  'royal',
  'oak',
  'offshore',
  'reverso',
  'polaris',
  'bb58',
  'bb36',
  'bb41',
])

/** Colloquial nicknames — preferred over generic model-family tokens like submariner. */
const DISTINCTIVE_NICKNAMES = new Set([
  'hulk',
  'kermit',
  'batman',
  'pepsi',
  'coke',
  'meteorite',
  'smurf',
  'starbucks',
  'rootbeer',
  'ghost',
  'newman',
  'sprite',
  'tiffany',
  'wimbledon',
  'snoopy',
  'moonwatch',
  'bb58',
  'bb36',
  'bb41',
])

export function tokenizeProductTitle(text: string): string[] {
  return String(text ?? '')
    .toLowerCase()
    .replace(/['']/g, '')
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter(Boolean)
}

export function normalizeBrandToken(brand: string | null | undefined): string {
  return String(brand ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)[0] ?? ''
}

export function extractReferenceTokens(title: string): string[] {
  const tokens = tokenizeProductTitle(title)
  const refs = new Set<string>()
  for (const token of tokens) {
    if (/^\d{4,6}[a-z]{0,4}$/.test(token)) refs.add(token)
    if (/^[a-z]{1,2}\d{4,6}[a-z]{0,4}$/.test(token)) refs.add(token)
  }
  return Array.from(refs).sort()
}

export function extractNicknameTokens(title: string): string[] {
  const seen = new Set<string>()
  const all: string[] = []
  const distinctive: string[] = []
  for (const token of tokenizeProductTitle(title)) {
    if (!WATCH_TITLE_NICKNAMES.has(token) || seen.has(token)) continue
    seen.add(token)
    all.push(token)
    if (DISTINCTIVE_NICKNAMES.has(token)) distinctive.push(token)
  }
  return distinctive.length ? distinctive : all
}

export function significantTitleTokens(name: string, brand?: string | null): string[] {
  const seen = new Set<string>()
  const out: string[] = []

  const push = (token: string) => {
    if (!token || token.length < 2) return
    if (TITLE_STOPWORDS.has(token)) return
    if (GENERIC_CATALOG_WORDS.has(token) && !WATCH_TITLE_NICKNAMES.has(token)) return
    if (seen.has(token)) return
    seen.add(token)
    out.push(token)
  }

  const brandToken = normalizeBrandToken(brand)
  if (brandToken) push(brandToken)

  for (const token of tokenizeProductTitle(name)) {
    push(token)
  }

  return out
}

export function titleKeywordFingerprint(name: string, brand?: string | null): string {
  const tokens = significantTitleTokens(name, brand).sort()
  return tokens.join('|')
}

/** Primary grouping key — reference > nickname > keyword fingerprint. */
export function titleDuplicateGroupKey(
  name: string,
  brand?: string | null
): { key: string; label: string } | null {
  const brandToken = normalizeBrandToken(brand)
  const nicknames = extractNicknameTokens(name)
  if (brandToken && nicknames.length) {
    const nick = nicknames[0]
    return {
      key: `nick:${brandToken}:${nick}`,
      label: `${brandToken.toUpperCase()} · ${nick}`,
    }
  }

  const refs = extractReferenceTokens(name)
  if (brandToken && refs.length) {
    const ref = refs[0]
    return {
      key: `ref:${brandToken}:${ref}`,
      label: `${brandToken.toUpperCase()} · ref ${ref.toUpperCase()}`,
    }
  }

  const fingerprint = titleKeywordFingerprint(name, brand)
  const tokenCount = fingerprint ? fingerprint.split('|').length : 0
  const hasNumber = /\d{4,}/.test(fingerprint)
  if (tokenCount >= 4 || (tokenCount >= 3 && hasNumber)) {
    const labelTokens = fingerprint.split('|').slice(0, 5).join(' · ')
    return {
      key: `fp:${fingerprint}`,
      label: labelTokens,
    }
  }

  return null
}

export type ProductTitleDuplicateInput = {
  id: string
  name: string
  sku: string | null
  status: string
  brand: string | null
  image_url: string
  source_url?: string | null
}

export type TitleDuplicateProduct = {
  id: string
  name: string
  sku: string | null
  status: string
  brand: string | null
  image_url: string
  source_url: string | null
}

export type TitleDuplicateGroup = {
  titleKey: string
  matchLabel: string
  products: TitleDuplicateProduct[]
}

export type TitleDuplicateScanResult = {
  groups: TitleDuplicateGroup[]
  scannedProducts: number
  duplicateProductIds: string[]
}

function toTitleDuplicateProduct(row: ProductTitleDuplicateInput): TitleDuplicateProduct {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    status: row.status,
    brand: row.brand,
    image_url: row.image_url,
    source_url: row.source_url ?? null,
  }
}

/** Group products with matching title keywords (reference, nickname, or fingerprint). */
export function findProductTitleDuplicateGroups(
  products: ProductTitleDuplicateInput[]
): TitleDuplicateScanResult {
  const byKey = new Map<string, { label: string; productIds: Set<string> }>()
  const productById = new Map<string, ProductTitleDuplicateInput>()

  for (const product of products) {
    productById.set(product.id, product)
    const group = titleDuplicateGroupKey(product.name, product.brand)
    if (!group) continue

    let bucket = byKey.get(group.key)
    if (!bucket) {
      bucket = { label: group.label, productIds: new Set() }
      byKey.set(group.key, bucket)
    }
    bucket.productIds.add(product.id)
  }

  const groups: TitleDuplicateGroup[] = []
  const duplicateProductIds = new Set<string>()

  for (const [titleKey, bucket] of Array.from(byKey.entries())) {
    if (bucket.productIds.size < 2) continue
    const groupProducts = Array.from(bucket.productIds)
      .map((id) => productById.get(id))
      .filter((p): p is ProductTitleDuplicateInput => Boolean(p))
      .map(toTitleDuplicateProduct)
      .sort((a, b) => a.name.localeCompare(b.name))

    for (const p of groupProducts) duplicateProductIds.add(p.id)

    groups.push({
      titleKey,
      matchLabel: bucket.label,
      products: groupProducts,
    })
  }

  groups.sort((a, b) => {
    const countDiff = b.products.length - a.products.length
    if (countDiff !== 0) return countDiff
    return a.matchLabel.localeCompare(b.matchLabel)
  })

  return {
    groups,
    scannedProducts: products.length,
    duplicateProductIds: Array.from(duplicateProductIds),
  }
}
