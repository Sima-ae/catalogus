import { slugifyCategory } from '@/lib/category-slug'

/** Stable i18n key for a category display name (matches `category.shoes`, etc.). */
export function categoryI18nKey(categoryName: string): string {
  const slug = slugifyCategory(String(categoryName ?? ''))
  return slug ? `category.${slug}` : 'category.unknown'
}

/** Preserve ALL CAPS style when the source category name uses it. */
export function formatCategoryTranslatedLabel(sourceName: string, translated: string): string {
  const source = String(sourceName ?? '').trim()
  const text = String(translated ?? '').trim()
  if (!text) return source
  const letters = source.replace(/[^A-Za-zÀ-ÿ]/g, '')
  if (letters.length > 0 && letters === letters.toUpperCase()) {
    return text.toUpperCase()
  }
  return text
}
