export type CategoryRow = {
  name?: string
  active?: boolean | number
}

/** Build shop sidebar / filter menu: "All" + active category names from the database. */
export function buildShopCategoryMenu(rows: CategoryRow[]): string[] {
  const names = rows
    .filter((row) => row.active !== false && row.active !== 0)
    .map((row) => String(row.name || '').trim())
    .filter(Boolean)

  const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
  return ['All', ...unique]
}
