import { categoryI18nKey } from '@/lib/category-i18n-key'
import type { Locale } from '@/lib/i18n'

type Translator = (key: string) => string

/**
 * Translate category names from the DB/API for the active shop locale.
 * Uses static i18n bundles first, then auto-generated DB translations.
 */
export function getTopCategoryLabel(
  category: string,
  t: Translator,
  opts?: { allStyle?: 'all' | 'home' }
): string {
  const raw = String(category ?? '').trim()
  if (!raw) return raw

  if (raw === 'All') {
    return opts?.allStyle === 'home' ? t('nav.home') : t('category.all')
  }

  const key = categoryI18nKey(raw)
  const translated = t(key)
  if (translated && translated !== key) return translated
  return raw
}
