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

/** Remove Yupoo import marker segments from SKU (case-insensitive). */
export function stripYupooFromSku(sku: string): string {
  let s = sku.replace(/yupoo/gi, '')
  s = s.replace(/[ _-]+/g, '-').replace(/(^-+|-+$)/g, '')
  return s.slice(0, 255)
}

/** Trim SKU; empty string becomes null (no SKU). Strips legacy "YUPOO" segments. */
export function normalizeProductSku(sku: unknown): string | null {
  if (sku == null || sku === '') return null
  const trimmed = stripYupooFromSku(String(sku).trim())
  return trimmed || null
}

/** Require a non-empty SKU (create/update). */
export function requireProductSku(sku: unknown): string {
  const normalized = normalizeProductSku(sku)
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
