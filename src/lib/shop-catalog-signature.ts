/** Stable key for matching SSR catalog payload to client URL filters. */
export function buildShopCatalogSignature(
  searchParams: Record<string, string | string[] | undefined>,
  mode: 'all' | 'new' = 'all',
  options?: { shuffle?: boolean }
): string {
  const page = pickSearchParam(searchParams, 'page') ?? '1'
  const category = pickSearchParam(searchParams, 'category') ?? 'All'
  const subcategory = pickSearchParam(searchParams, 'subcategory') ?? 'All'
  const nested = pickSearchParam(searchParams, 'nested') ?? 'All'
  const brand = pickSearchParam(searchParams, 'brand') ?? 'All'
  const tag = pickSearchParam(searchParams, 'tag') ?? ''
  const search = pickSearchParam(searchParams, 'search') ?? ''
  const shuffle = options?.shuffle ? '1' : '0'
  return `${page}|${category}|${subcategory}|${nested}|${brand}|${tag}|${search}|${mode}|${shuffle}`
}

function pickSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const raw = searchParams[key]
  const value = Array.isArray(raw) ? raw[0] : raw
  const trimmed = value?.trim()
  return trimmed || undefined
}
