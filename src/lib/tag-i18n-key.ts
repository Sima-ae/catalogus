import { slugifyCategory } from '@/lib/category-slug'
import { formatCategoryTranslatedLabel } from '@/lib/category-i18n-key'

/** Stable i18n key for a product tag (e.g. `tag.women`). */
export function tagI18nKey(tagName: string): string {
  const slug = slugifyCategory(String(tagName ?? ''))
  return slug ? `tag.${slug}` : 'tag.unknown'
}

/** Canonical tag name stored in `tag_translations` (trimmed). */
export function normalizeTagName(tagName: string): string {
  return String(tagName ?? '').trim()
}

/** Preserve ALL CAPS style when the source tag uses it. */
export function formatTagTranslatedLabel(sourceName: string, translated: string): string {
  return formatCategoryTranslatedLabel(sourceName, translated)
}
