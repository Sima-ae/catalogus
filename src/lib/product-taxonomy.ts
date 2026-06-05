import type { CategoryPickerOption } from '@/lib/category-picker'

/** Display separator for parent › child in stored category labels. */
export const CATEGORY_PATH_SEPARATOR = ' › '

/** Label stored in `products.category` — unambiguous for duplicate subcategory names. */
export function categoryStorageLabel(
  option: Pick<CategoryPickerOption, 'name' | 'listLabel' | 'isSubcategory'>
): string {
  return option.isSubcategory ? option.listLabel : option.name
}

/** Parse compound category label (e.g. "SOCCER › SHOES / BAGS"). */
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

/** @deprecated Prefer joinCategoryStorageLabels — bare names collide across parents. */
export function joinCategoryNames(selected: Set<string>, order: string[]): string {
  return orderedTaxonomyNames(selected, order).join(' / ')
}

export function joinBrandNames(selected: Set<string>, order: string[]): string {
  return orderedTaxonomyNames(selected, order).join(' X ')
}

function normalizeSegmentKey(segment: string): string {
  return segment.trim().toLowerCase()
}

/** Match one compound segment to a category option (handles SOCCER › SHOES vs bare SHOES). */
export function resolveCategoryOptionFromSegment(
  segment: string,
  options: CategoryPickerOption[]
): CategoryPickerOption | undefined {
  const trimmed = segment.trim()
  if (!trimmed) return undefined

  const key = normalizeSegmentKey(trimmed)
  const byListLabel = options.find((o) => normalizeSegmentKey(o.listLabel) === key)
  if (byListLabel) return byListLabel

  const byName = options.filter((o) => normalizeSegmentKey(o.name) === key)
  if (byName.length === 1) return byName[0]
  if (byName.length > 1) {
    return byName.find((o) => !o.isSubcategory) ?? byName[0]
  }
  return undefined
}

/** Resolve compound `products.category` text to unique category ids. */
export function categoryIdsFromCompound(
  compound: string,
  options: CategoryPickerOption[],
  hintCategoryId?: string | null
): string[] {
  const segments = parseCategoryCompound(compound)
  const ids: string[] = []

  for (const segment of segments) {
    const opt = resolveCategoryOptionFromSegment(segment, options)
    if (opt && !ids.includes(opt.id)) ids.push(opt.id)
  }

  if (ids.length === 0 && hintCategoryId?.trim()) {
    const hint = options.find((o) => o.id === hintCategoryId.trim())
    if (hint) ids.push(hint.id)
    return ids
  }

  if (segments.length === 1 && ids.length === 1 && hintCategoryId?.trim()) {
    const hint = options.find((o) => o.id === hintCategoryId.trim())
    const segmentKey = normalizeSegmentKey(segments[0]!)
    if (
      hint &&
      normalizeSegmentKey(hint.name) === segmentKey &&
      hint.id !== ids[0] &&
      options.filter((o) => normalizeSegmentKey(o.name) === segmentKey).length > 1
    ) {
      return [hint.id]
    }
  }

  return ids
}

/** Build compound category string from selected ids (tree order). */
export function joinCategoryStorageLabels(
  selectedIds: Set<string> | Iterable<string>,
  options: CategoryPickerOption[]
): string {
  const idSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds)
  const labels: string[] = []
  for (const opt of options) {
    if (!idSet.has(opt.id)) continue
    const label = categoryStorageLabel(opt)
    if (!labels.includes(label)) labels.push(label)
  }
  return labels.join(' / ')
}

/** First selected category in picker order — used for `products.category_id`. */
export function primaryCategoryId(
  selectedIds: Iterable<string>,
  options: CategoryPickerOption[]
): string | null {
  const idSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds)
  for (const opt of options) {
    if (idSet.has(opt.id)) return opt.id
  }
  const first = Array.from(idSet)[0]
  return first ?? null
}

/** Union of category ids from many products' compound labels. */
export function unionCategoryIdsFromProducts(
  products: { category?: string | null; category_id?: string | null }[],
  options: CategoryPickerOption[]
): Set<string> {
  const ids = new Set<string>()
  for (const product of products) {
    for (const id of categoryIdsFromCompound(
      String(product.category ?? ''),
      options,
      product.category_id
    )) {
      ids.add(id)
    }
  }
  return ids
}
