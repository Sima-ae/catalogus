/** Trim SKU; empty string becomes null (no SKU). */
export function normalizeProductSku(sku: unknown): string | null {
  if (sku == null || sku === '') return null
  const trimmed = String(sku).trim()
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
