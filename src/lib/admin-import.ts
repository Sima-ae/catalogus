export type ImportSourceInput = {
  name: string
  yupoo_category_url: string
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
    yupoo_category_url: String(raw.yupoo_category_url ?? '').trim(),
    catalog_category_id: String(raw.catalog_category_id ?? '').trim(),
    catalog_brand_id: String(raw.catalog_brand_id ?? '').trim(),
    ...(passwordProvided
      ? { yupoo_access_password: String(raw.yupoo_access_password ?? '').trim() }
      : {}),
    yupoo_access_password_provided: passwordProvided,
  }
}

export function validateImportSourceInput(input: ImportSourceInput): string | null {
  if (!input.name || !input.yupoo_category_url) {
    return 'Name and URL are required'
  }
  if (!input.catalog_category_id) {
    return 'Catalog category is required'
  }
  return null
}

export function buildImportWorkerCommand(jobId: string, extraFlags: string[] = []): string {
  const flags = extraFlags.filter(Boolean).join(' ')
  return flags
    ? `npm run import:worker -- --job=${jobId} ${flags}`
    : `npm run import:worker -- --job=${jobId}`
}
