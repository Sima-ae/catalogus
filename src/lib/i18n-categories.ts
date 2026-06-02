import type { Locale } from '@/lib/i18n'

type Translator = (key: string) => string

function normalizeCategoryName(name: string): string {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

const TOP_CATEGORY_KEYS: Record<string, string> = {
  all: 'category.all',
  clothes: 'category.clothes',
  kids: 'category.kids',
  shoes: 'category.shoes',
  slippers: 'category.slippers',
  sneakers: 'category.sneakers',
  soccer: 'category.soccer',
  watches: 'category.watches',
}

/**
 * Translate known top-level category names coming from the DB/API.
 * Falls back to the raw category string for unknown/new categories.
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

  const key = TOP_CATEGORY_KEYS[normalizeCategoryName(raw)]
  if (!key) return raw
  const translated = t(key)
  return translated || raw
}

