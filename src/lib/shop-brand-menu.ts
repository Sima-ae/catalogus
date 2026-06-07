export type BrandRow = {
  name?: string
  active?: boolean | number
}

/** Build shop filter menu: active brand names only (no "All" pill — absence of ?brand= means all brands). */
export function buildShopBrandMenu(rows: BrandRow[]): string[] {
  const names = rows
    .filter((row) => row.active !== false && row.active !== 0)
    .map((row) => String(row.name || '').trim())
    .filter(Boolean)

  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
}
