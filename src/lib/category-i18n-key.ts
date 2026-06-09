import { slugifyCategory } from '@/lib/category-slug'

/** DB labels whose slug does not match the i18n key slug. */
const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  'bags-wallets': 'bags-and-wallets',
  'bags--wallets': 'bags-and-wallets',
}

/** Stable i18n key for a category display name (matches `category.shoes`, etc.). */
export function categoryI18nKey(categoryName: string): string {
  const slug = slugifyCategory(String(categoryName ?? ''))
  const resolved = slug ? (CATEGORY_SLUG_ALIASES[slug] ?? slug) : ''
  return resolved ? `category.${resolved}` : 'category.unknown'
}

/** Use translated label as-is (do not mirror ALL CAPS from legacy DB names). */
export function formatCategoryTranslatedLabel(_sourceName: string, translated: string): string {
  const text = String(translated ?? '').trim()
  if (text) return text
  return String(_sourceName ?? '').trim()
}
