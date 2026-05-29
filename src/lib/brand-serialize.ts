/** Plain JSON-safe brand row for API responses. */
export function serializeBrand(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    slug: String(row.slug ?? ''),
    description:
      row.description != null && row.description !== ''
        ? String(row.description)
        : null,
    active: row.active === false || row.active === 0 ? false : true,
  }
}
