import { categoryI18nKey } from '@/lib/category-i18n-key'
import type { Locale } from '@/lib/i18n'

type Translator = (key: string) => string

/** Map shop locale codes to BCP 47 tags for Intl.Collator. */
const COLLATOR_LOCALE: Record<string, string> = {
  gr: 'el',
  cz: 'cs',
  ba: 'bs',
  eg: 'ar',
  at: 'ar',
  ps: 'ar',
  ma: 'ar',
  dz: 'ar',
}

function collatorLocale(locale: string): string {
  return COLLATOR_LOCALE[locale] ?? locale
}

/** Sentence-case legacy ALL CAPS category names when no translation exists. */
function humanizeAllCapsCategoryLabel(raw: string): string {
  const letters = raw.replace(/[^A-Za-zÀ-ÿ]/g, '')
  if (letters.length > 0 && letters === letters.toUpperCase()) {
    const lower = raw.toLowerCase()
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  }
  return raw
}

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
  return humanizeAllCapsCategoryLabel(raw)
}

/** Sort shop category ids: "All" first, then A–Z by translated label for the active locale. */
export function sortShopCategoriesByLabel(
  categories: string[],
  t: Translator,
  locale: Locale | string,
  opts?: { allStyle?: 'all' | 'home' }
): string[] {
  if (categories.length <= 1) return categories

  const collator = new Intl.Collator(collatorLocale(String(locale)), {
    sensitivity: 'base',
    numeric: true,
  })
  const label = (category: string) =>
    getTopCategoryLabel(category, t, { allStyle: opts?.allStyle ?? 'all' })

  const all = categories.filter((category) => category === 'All')
  const rest = categories.filter((category) => category !== 'All')
  rest.sort((a, b) => collator.compare(label(a), label(b)))
  return [...all, ...rest]
}
