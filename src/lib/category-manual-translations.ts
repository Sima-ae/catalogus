import { categoryI18nKey } from '@/lib/category-i18n-key'
import { slugifyCategory } from '@/lib/category-slug'
import type { Locale } from '@/lib/i18n-locale-registry'

type LocaleTranslationPack = { en: string } & Partial<Record<Locale, string>>

/**
 * Hand-crafted category labels (plural where the catalog lists multiple items).
 * Keys are category slugs; used for static i18n and DB sync overrides.
 */
const PACKS: Record<string, LocaleTranslationPack> = {
  glasses: {
    en: 'Glasses',
    nl: 'Brillen',
    de: 'Brillen',
    fr: 'Lunettes',
    es: 'Gafas',
    pt: 'Óculos',
    it: 'Occhiali',
    gr: 'Γυαλιά',
    pl: 'Okulary',
    cz: 'Brýle',
    sk: 'Okuliare',
    hu: 'Szemüvegek',
    ro: 'Ochelari',
    bg: 'Очила',
    hr: 'Naočale',
    sr: 'Наочаре',
    ba: 'Naočale',
    me: 'Naočale',
    sq: 'Syze',
    mk: 'Наочари',
    lt: 'Akiniai',
    da: 'Briller',
    sv: 'Glasögon',
    nb: 'Briller',
    fi: 'Silmälasit',
    uk: 'Окуляри',
    ru: 'Очки',
    tr: 'Gözlükler',
    he: 'משקפיים',
    eg: 'نظارات',
    at: 'نظارات',
    ps: 'نظارات',
    ma: 'نظارات',
    dz: 'نظارات',
    ka: 'სათვალეები',
    hy: 'ակնոցներ',
    az: 'Eynəklər',
    ja: 'メガネ',
    zh: '眼镜',
  },
}

function packForCategory(categoryName: string): LocaleTranslationPack | null {
  const slug = slugifyCategory(categoryName)
  return slug ? (PACKS[slug] ?? null) : null
}

/** Curated label for a category locale, or null when no manual pack exists. */
export function getCategoryManualTranslation(
  categoryName: string,
  locale: Locale
): string | null {
  const pack = packForCategory(categoryName)
  if (!pack) return null
  return pack[locale] ?? pack.en
}

/** `category.*` keys merged into static i18n bundles. */
export function getCategoryManualI18nExtras(locale: Locale): Record<string, string> {
  const out: Record<string, string> = {}
  for (const pack of Object.values(PACKS)) {
    const label = pack[locale] ?? pack.en
    if (!label) continue
    out[categoryI18nKey(pack.en)] = label
  }
  return out
}
