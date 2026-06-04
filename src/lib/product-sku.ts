/** Slug for SKU prefix (e.g. "Yves Saint Laurent" → "YVES-SAINT-LAURENT"). */
export function brandSkuPrefix(brandName: string | null | undefined): string {
  const raw = String(brandName ?? '').trim()
  if (!raw) return ''
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Drop leading brand slug from SKU when it matches the product brand (case-insensitive). */
export function stripBrandPrefixFromSku(
  sku: string,
  brandName: string | null | undefined
): string {
  const prefix = brandSkuPrefix(brandName)
  if (!prefix) return String(sku ?? '').trim()
  return stripAllBrandPrefixesFromSku(sku, [prefix])
}

/** Remove any leading brand slug(s) from SKU (longest prefixes first). */
export function stripAllBrandPrefixesFromSku(sku: string, prefixes: string[]): string {
  let s = String(sku ?? '').trim()
  if (!s || !prefixes.length) return s

  let changed = true
  while (changed) {
    changed = false
    for (const prefix of prefixes) {
      if (!prefix) continue
      const re = new RegExp(`^${escapeRegExp(prefix)}-`, 'i')
      if (re.test(s)) {
        s = s.replace(re, '')
        changed = true
        break
      }
    }
  }

  s = s.replace(/(^-+|-+$)/g, '')
  return s || String(sku ?? '').trim()
}

/** Remove Yupoo import marker segments from SKU (case-insensitive). */
export function stripYupooFromSku(sku: string): string {
  let s = sku.replace(/yupoo/gi, '')
  s = s.replace(/[ _-]+/g, '-').replace(/(^-+|-+$)/g, '')
  return s.slice(0, 255)
}

/** Trim SKU; empty string becomes null (no SKU). Strips legacy "YUPOO" segments. */
export function normalizeProductSku(
  sku: unknown,
  brandPrefixes?: string[]
): string | null {
  if (sku == null || sku === '') return null
  let trimmed = stripYupooFromSku(String(sku).trim())
  if (brandPrefixes?.length) {
    trimmed = stripAllBrandPrefixesFromSku(trimmed, brandPrefixes)
  }
  return trimmed || null
}

/** Require a non-empty SKU (create/update). */
export function requireProductSku(sku: unknown, brandPrefixes?: string[]): string {
  const normalized = normalizeProductSku(sku, brandPrefixes)
  if (!normalized) {
    throw new MissingSkuError()
  }
  return normalized
}

export class MissingSkuError extends Error {
  constructor() {
    super('SKU is required.')
    this.name = 'MissingSkuError'
  }
}

export class DuplicateSkuError extends Error {
  readonly sku: string

  constructor(sku: string) {
    super(`SKU "${sku}" is already used by another product. Choose a different SKU.`)
    this.name = 'DuplicateSkuError'
    this.sku = sku
  }
}
