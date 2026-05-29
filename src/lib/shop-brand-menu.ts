export type BrandRow = {
  name?: string
  active?: boolean | number
}

/** Build shop filter menu: "All" + active brand names from the database. */
export function buildShopBrandMenu(rows: BrandRow[]): string[] {
  const names = rows
    .filter((row) => row.active !== false && row.active !== 0)
    .map((row) => String(row.name || '').trim())
    .filter(Boolean)

  const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
  return ['All', ...unique]
}
