import { slugifyCategory } from '@/lib/category-slug'

/** DB labels whose slug does not match the i18n key slug. */
const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  'bags-wallets': 'bags-and-wallets',
  'bags--wallets': 'bags-and-wallets',
  tie: 'ties',
  belt: 'belts',
  sock: 'socks',
  scarf: 'scarves',
  glove: 'gloves',
  sandal: 'sandals',
  boot: 'boots',
  watch: 'watches',
  sneaker: 'sneakers',
  slipper: 'slippers',
  shirt: 'shirts',
  short: 'shorts',
  hat: 'hats',
  glass: 'glasses',
  perfume: 'perfumes',
  bag: 'bags',
  wallet: 'wallets',
  cufflink: 'cufflinks',
  keychain: 'keychains',
  jacket: 'jackets',
  pant: 'pants',
  jean: 'jeans',
  dress: 'dresses',
  skirt: 'skirts',
  sweater: 'sweaters',
  hoodie: 'hoodies',
  suit: 'suits',
  vest: 'vests',
  'bikini--swimsuit': 'bikini--swimwear',
  'bikini-swimsuit': 'bikini--swimwear',
  'underwear-socks': 'underwear--socks',
  accessory: 'accessories',
}

/** Stable i18n key for a category display name (matches `category.shoes`, etc.). */
export function categoryI18nKey(categoryName: string): string {
  const slug = slugifyCategory(String(categoryName ?? ''))
  const resolved = slug ? (CATEGORY_SLUG_ALIASES[slug] ?? slug) : ''
  return resolved ? `category.${resolved}` : 'category.unknown'
}

/** Strip machine-translation markup (e.g. DeepL `<g id="1">…</g>`). */
export function sanitizeTranslationMarkup(text: string): string {
  return String(text ?? '')
    .replace(/<g[^>]*>/gi, '')
    .replace(/<\/g>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Use translated label as-is (do not mirror ALL CAPS from legacy DB names). */
export function formatCategoryTranslatedLabel(_sourceName: string, translated: string): string {
  const text = sanitizeTranslationMarkup(translated)
  if (text) return text
  return sanitizeTranslationMarkup(String(_sourceName ?? ''))
}
