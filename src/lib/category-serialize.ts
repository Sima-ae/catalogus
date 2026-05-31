/** Plain JSON-safe category row for API responses. */
export function serializeCategory(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    slug: String(row.slug ?? ''),
    description:
      row.description != null && row.description !== ''
        ? String(row.description)
        : null,
    parent_id:
      row.parent_id != null && String(row.parent_id).trim() !== ''
        ? String(row.parent_id)
        : null,
    parent_name:
      row.parent_name != null && String(row.parent_name).trim() !== ''
        ? String(row.parent_name)
        : null,
    active: row.active === false || row.active === 0 ? false : true,
  }
}
