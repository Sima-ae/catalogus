export type CategoryRow = {
  name?: string
  active?: boolean | number
  parent_id?: string | null
}

/** Build shop sidebar / filter menu: "All" + top-level active categories only. */
export function buildShopCategoryMenu(rows: CategoryRow[]): string[] {
  const names = rows
    .filter((row) => row.active !== false && row.active !== 0)
    .filter((row) => {
      const parentId = row.parent_id
      return parentId == null || String(parentId).trim() === ''
    })
    .map((row) => String(row.name || '').trim())
    .filter(Boolean)

  const unique = Array.from(new Set(names))
  return ['All', ...unique]
}
