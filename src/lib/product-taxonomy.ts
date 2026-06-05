/** Parse compound category label (e.g. "SHOES / BAGS"). */
export function parseCategoryCompound(value: string): string[] {
  if (!value.trim()) return []
  return value
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Parse compound brand label (e.g. "Supreme X Nike"). */
export function parseBrandCompound(value: string): string[] {
  if (!value.trim()) return []
  return value
    .split(/\s+X\s+/i)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function orderedTaxonomyNames(selected: Set<string>, order: string[]): string[] {
  const out: string[] = []
  for (const name of order) {
    if (selected.has(name) && !out.includes(name)) out.push(name)
  }
  for (const name of Array.from(selected)) {
    if (!out.includes(name)) out.push(name)
  }
  return out
}

export function joinCategoryNames(selected: Set<string>, order: string[]): string {
  return orderedTaxonomyNames(selected, order).join(' / ')
}

export function joinBrandNames(selected: Set<string>, order: string[]): string {
  return orderedTaxonomyNames(selected, order).join(' X ')
}
