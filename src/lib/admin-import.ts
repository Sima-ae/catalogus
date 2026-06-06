import type { ImportSourceType } from '@/lib/import-db'
import { normalizeImportSourceType } from '@/lib/import-db'

export type ImportSourceInput = {
  name: string
  source_type: ImportSourceType
  yupoo_category_url: string
  woocommerce_store_url: string
  woocommerce_category_slug: string
  catalog_category_id: string
  catalog_brand_id: string
  /** Set when client sends yupoo_access_password in JSON body. */
  yupoo_access_password?: string
  /** True when body includes yupoo_access_password (even empty = clear). */
  yupoo_access_password_provided?: boolean
}

export function parseImportSourceBody(body: unknown): ImportSourceInput | null {
  if (!body || typeof body !== 'object') return null
  const raw = body as Record<string, unknown>
  const passwordProvided = Object.prototype.hasOwnProperty.call(raw, 'yupoo_access_password')
  return {
    name: String(raw.name ?? '').trim(),
    source_type: normalizeImportSourceType(String(raw.source_type ?? 'yupoo')),
    yupoo_category_url: String(raw.yupoo_category_url ?? '').trim(),
    woocommerce_store_url: String(raw.woocommerce_store_url ?? '').trim(),
    woocommerce_category_slug: String(raw.woocommerce_category_slug ?? '').trim(),
    catalog_category_id: String(raw.catalog_category_id ?? '').trim(),
    catalog_brand_id: String(raw.catalog_brand_id ?? '').trim(),
    ...(passwordProvided
      ? { yupoo_access_password: String(raw.yupoo_access_password ?? '').trim() }
      : {}),
    yupoo_access_password_provided: passwordProvided,
  }
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function validateImportSourceInput(input: ImportSourceInput): string | null {
  if (!input.name) {
    return 'Name is required'
  }
  if (!input.catalog_category_id) {
    return 'Catalog category is required'
  }
  if (input.source_type === 'woocommerce') {
    if (!input.woocommerce_store_url) {
      return 'WooCommerce store URL is required (site root, e.g. https://stuntxl.com — not a product URL)'
    }
    if (!isValidHttpUrl(input.woocommerce_store_url)) {
      return 'WooCommerce store URL must be a valid http(s) URL'
    }
    return null
  }
  if (!input.yupoo_category_url) {
    return 'Yupoo category URL is required'
  }
  return null
}

export function buildImportWorkerCommand(jobId: string, extraFlags: string[] = []): string {
  const flags = extraFlags.filter(Boolean).join(' ')
  return flags
    ? `npm run import:worker -- --job=${jobId} ${flags}`
    : `npm run import:worker -- --job=${jobId}`
}
