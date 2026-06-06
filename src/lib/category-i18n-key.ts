import { slugifyCategory } from '@/lib/category-slug'

/** Stable i18n key for a category display name (matches `category.shoes`, etc.). */
export function categoryI18nKey(categoryName: string): string {
  const slug = slugifyCategory(String(categoryName ?? ''))
  return slug ? `category.${slug}` : 'category.unknown'
}

/** Use translated label as-is (do not mirror ALL CAPS from legacy DB names). */
export function formatCategoryTranslatedLabel(_sourceName: string, translated: string): string {
  const text = String(translated ?? '').trim()
  if (text) return text
  return String(_sourceName ?? '').trim()
}
