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
  perfumes: {
    en: 'Perfumes',
    nl: 'Parfums',
    de: 'Parfums',
    fr: 'Parfums',
    es: 'Perfumes',
    pt: 'Perfumes',
    it: 'Profumi',
    gr: 'Αρώματα',
    pl: 'Perfumy',
    cz: 'Parfémy',
    sk: 'Parfémy',
    hu: 'Parfümök',
    ro: 'Parfumuri',
    bg: 'Парфюми',
    hr: 'Parfemi',
    sr: 'Парфеми',
    ba: 'Parfemi',
    me: 'Parfemi',
    sq: 'Parfume',
    mk: 'Парфеми',
    lt: 'Kvepalai',
    da: 'Parfumer',
    sv: 'Parfymer',
    nb: 'Parfymer',
    fi: 'Hajuvedet',
    uk: 'Парфуми',
    ru: 'Парфюмы',
    tr: 'Parfümler',
    he: 'בשמים',
    eg: 'عطور',
    at: 'عطور',
    ps: 'عطور',
    ma: 'عطور',
    dz: 'عطور',
    ka: 'სუნამოები',
    hy: 'Օծանելիքներ',
    az: 'Parfümlər',
    ja: '香水',
    zh: '香水',
  },
  bags: {
    en: 'Bags',
    nl: 'Tassen',
    de: 'Taschen',
    fr: 'Sacs',
    es: 'Bolsos',
    pt: 'Malas',
    it: 'Borse',
    gr: 'Τσάντες',
    pl: 'Torby',
    cz: 'Tašky',
    sk: 'Tašky',
    hu: 'Táskák',
    ro: 'Genți',
    bg: 'Чанти',
    hr: 'Torbe',
    sr: 'Торбе',
    ba: 'Torbe',
    me: 'Torbe',
    sq: 'Çanta',
    mk: 'Торби',
    lt: 'Krepšiai',
    da: 'Tasker',
    sv: 'Väskor',
    nb: 'Vesker',
    fi: 'Laukut',
    uk: 'Сумки',
    ru: 'Сумки',
    tr: 'Çantalar',
    he: 'תיקים',
    eg: 'حقائب',
    at: 'حقائب',
    ps: 'حقائب',
    ma: 'حقائب',
    dz: 'حقائب',
    ka: 'ჩანთები',
    hy: 'պայուսակներ',
    az: 'Çantalar',
    ja: 'バッグ',
    zh: '包',
  },
  wallets: {
    en: 'Wallets',
    nl: 'Portemonnees',
    de: 'Geldbörsen',
    fr: 'Portefeuilles',
    es: 'Carteras',
    pt: 'Carteiras',
    it: 'Portafogli',
    gr: 'Πορτοφόλια',
    pl: 'Portfele',
    cz: 'Peněženky',
    sk: 'Peňaženky',
    hu: 'Pénztárcák',
    ro: 'Portofele',
    bg: 'Портфейли',
    hr: 'Novčanici',
    sr: 'Новчаници',
    ba: 'Novčanici',
    me: 'Novčanici',
    sq: 'Portofolet',
    mk: 'Паричници',
    lt: 'Piniginės',
    da: 'Punge',
    sv: 'Plånböcker',
    nb: 'Lommebøker',
    fi: 'Lompakot',
    uk: 'Гаманці',
    ru: 'Кошельки',
    tr: 'Cüzdanlar',
    he: 'ארנקים',
    eg: 'محافظ',
    at: 'محافظ',
    ps: 'محافظ',
    ma: 'محافظ',
    dz: 'محافظ',
    ka: 'საფულეები',
    hy: 'դրամապանակներ',
    az: 'Cüzdanlar',
    ja: '財布',
    zh: '钱包',
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
