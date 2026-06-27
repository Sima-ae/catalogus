/** Minimal row for building hierarchical category selects. */
export type CategoryTreeRow = {
  id: string
  name: string
  parent_id?: string | null
  parent_name?: string | null
}

export type CategoryPickerOption = {
  id: string
  name: string
  /** Short label for &lt;select&gt; (indented ↳ for subcategories). */
  label: string
  /** Unambiguous label for lists (e.g. SOCCER › SHOES). */
  listLabel: string
  depth: number
  parent_id: string | null
  parent_name: string | null
  isSubcategory: boolean
}

function normalizeTreeRow(row: CategoryTreeRow) {
  return {
    id: String(row.id),
    name: String(row.name),
    parent_id: row.parent_id ? String(row.parent_id) : null,
    parent_name: row.parent_name ? String(row.parent_name) : null,
  }
}

/** Parents first, then their subcategories (alphabetically within each level). */
export function sortCategoryTreeRows<T extends CategoryTreeRow>(rows: T[]): T[] {
  const normalized = rows.map(normalizeTreeRow)
  const childrenByParent = new Map<string | null, typeof normalized>()

  for (const row of normalized) {
    const list = childrenByParent.get(row.parent_id) ?? []
    list.push(row)
    childrenByParent.set(row.parent_id, list)
  }

  for (const list of Array.from(childrenByParent.values())) {
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }

  const ordered: typeof normalized = []
  const visit = (parentId: string | null) => {
    for (const row of childrenByParent.get(parentId) ?? []) {
      ordered.push(row)
      visit(row.id)
    }
  }
  visit(null)

  if (ordered.length < normalized.length) {
    const seen = new Set(ordered.map((r) => r.id))
    for (const row of normalized) {
      if (!seen.has(row.id)) ordered.push(row)
    }
  }

  const byId = new Map(rows.map((r) => [String(r.id), r]))
  return ordered.map((r) => byId.get(r.id)!).filter(Boolean)
}

/** Options for selects: parent → children, subcategories prefixed with ↳ and indent. */
export function buildCategoryPickerOptions(rows: CategoryTreeRow[]): CategoryPickerOption[] {
  const normalized = rows.map(normalizeTreeRow)
  const childrenByParent = new Map<string | null, ReturnType<typeof normalizeTreeRow>[]>()

  for (const row of normalized) {
    const list = childrenByParent.get(row.parent_id) ?? []
    list.push(row)
    childrenByParent.set(row.parent_id, list)
  }

  for (const list of Array.from(childrenByParent.values())) {
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }

  const options: CategoryPickerOption[] = []

  const visit = (parentId: string | null, depth: number, ancestors: string[]) => {
    for (const row of childrenByParent.get(parentId) ?? []) {
      const isSubcategory = depth > 0
      const listLabel = isSubcategory
        ? [...ancestors, row.name].join(' › ')
        : row.name
      const indent = isSubcategory ? `${'  '.repeat(depth)}↳ ` : ''
      options.push({
        id: row.id,
        name: row.name,
        label: isSubcategory ? `${indent}${listLabel}` : listLabel,
        listLabel,
        depth,
        parent_id: row.parent_id,
        parent_name: row.parent_name,
        isSubcategory,
      })
      visit(row.id, depth + 1, [...ancestors, row.name])
    }
  }

  visit(null, 0, [])

  if (options.length < normalized.length) {
    const seen = new Set(options.map((o) => o.id))
    for (const row of normalized) {
      if (!seen.has(row.id)) {
        const listLabel = row.parent_id
          ? formatCategoryDisplayName(row.name, row.parent_name)
          : row.name
        options.push({
          id: row.id,
          name: row.name,
          label: listLabel,
          listLabel,
          depth: 0,
          parent_id: row.parent_id,
          parent_name: row.parent_name,
          isSubcategory: Boolean(row.parent_id),
        })
      }
    }
  }

  return options
}

/** All category ids nested under `rootId` (not including `rootId`). */
export function getCategoryDescendantIds(
  rows: CategoryTreeRow[],
  rootId: string
): Set<string> {
  const normalized = rows.map(normalizeTreeRow)
  const childrenByParent = new Map<string | null, ReturnType<typeof normalizeTreeRow>[]>()

  for (const row of normalized) {
    const list = childrenByParent.get(row.parent_id) ?? []
    list.push(row)
    childrenByParent.set(row.parent_id, list)
  }

  const out = new Set<string>()
  const visit = (parentId: string) => {
    for (const row of childrenByParent.get(parentId) ?? []) {
      out.add(row.id)
      visit(row.id)
    }
  }
  visit(String(rootId))
  return out
}

/** Parent picker for category create/edit — full tree, excluding self and descendants. */
export function buildCategoryParentPickerOptions(
  rows: CategoryTreeRow[],
  excludeCategoryId?: string | null
): CategoryPickerOption[] {
  const options = buildCategoryPickerOptions(rows)
  if (!excludeCategoryId) return options
  const blocked = new Set([
    String(excludeCategoryId),
    ...Array.from(getCategoryDescendantIds(rows, String(excludeCategoryId))),
  ])
  return options.filter((option) => !blocked.has(option.id))
}

/** Display name for tables (e.g. SOCCER › SHIRTS). */
export function formatCategoryDisplayName(
  name: string,
  parentName?: string | null
): string {
  const n = name.trim()
  const parent = parentName?.trim()
  if (parent) return `${parent} › ${n}`
  return n
}
