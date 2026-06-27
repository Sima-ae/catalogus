import { categoryI18nKey, sanitizeTranslationMarkup } from '@/lib/category-i18n-key'
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
  const translated = sanitizeTranslationMarkup(t(key))
  if (translated && translated !== key) {
    return humanizeAllCapsCategoryLabel(translated)
  }
  if (raw.includes('|')) {
    return raw
      .split('|')
      .map((segment) => getTopCategoryLabel(segment.trim(), t, opts))
      .join(' | ')
  }
  if (raw.includes('&')) {
    return raw
      .split('&')
      .map((segment) => getTopCategoryLabel(segment.trim(), t, opts))
      .join(' & ')
  }
  return humanizeAllCapsCategoryLabel(raw)
}

/** Translate compound labels (e.g. `KIDS › SHOES`). */
export function translateCategoryCompound(label: string, t: Translator): string {
  const raw = String(label ?? '').trim()
  if (!raw) return raw
  if (raw.includes('›')) {
    return raw
      .split('›')
      .map((segment) => getTopCategoryLabel(segment.trim(), t))
      .join(' › ')
  }
  return getTopCategoryLabel(raw, t)
}

/** Localized label for admin category picker options (includes ↳ indent for subcategories). */
export function getCategoryPickerLabel(
  option: {
    name: string
    listLabel: string
    isSubcategory: boolean
    depth: number
  },
  t: Translator
): string {
  if (!option.isSubcategory) {
    return getTopCategoryLabel(option.name, t)
  }
  const translated = translateCategoryCompound(option.listLabel, t)
  const indent = `${'  '.repeat(option.depth)}↳ `
  return `${indent}${translated}`
}

/** Drop duplicate pills that would show the same translated label. */
export function dedupeShopCategoriesByLabel(
  categories: string[],
  t: Translator,
  locale: Locale | string
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const category of categories) {
    if (category === 'All') {
      out.push(category)
      continue
    }
    const label = getTopCategoryLabel(category, t, { allStyle: 'all' })
      .toLocaleLowerCase(collatorLocale(String(locale)))
    if (seen.has(label)) continue
    seen.add(label)
    out.push(category)
  }
  return out
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
