/**
 * Extra category keys missing from some locale bundles (e.g. bags-and-wallets).
 * Run: node scripts/generate-i18n-category-extra.mjs
 */
import { writeFileSync } from 'fs'

const LOCALES = [
  'nl', 'en', 'fr', 'de', 'es', 'pt', 'it', 'gr', 'pl', 'cz', 'sk', 'hu', 'ro', 'bg',
  'hr', 'sr', 'ba', 'me', 'sq', 'mk', 'lt', 'da', 'sv', 'nb', 'fi', 'uk', 'ru', 'tr',
  'he', 'eg', 'at', 'ps', 'ma', 'ka', 'hy', 'dz', 'az', 'ja', 'zh',
]

const EN = {
  'category.bags-and-wallets': 'Bags and wallets',
  'category.tassen-en-portemonnees': 'Bags and wallets',
}

const PACKS = {
  nl: { 'category.bags-and-wallets': 'Tassen en portemonnees', 'category.tassen-en-portemonnees': 'Tassen en portemonnees' },
  de: { 'category.bags-and-wallets': 'Taschen und Geldbörsen', 'category.tassen-en-portemonnees': 'Taschen und Geldbörsen' },
  fr: { 'category.bags-and-wallets': 'Sacs et portefeuilles', 'category.tassen-en-portemonnees': 'Sacs et portefeuilles' },
  es: { 'category.bags-and-wallets': 'Bolsos y carteras', 'category.tassen-en-portemonnees': 'Bolsos y carteras' },
  pt: { 'category.bags-and-wallets': 'Malas e carteiras', 'category.tassen-en-portemonnees': 'Malas e carteiras' },
  it: { 'category.bags-and-wallets': 'Borse e portafogli', 'category.tassen-en-portemonnees': 'Borse e portafogli' },
  pl: { 'category.bags-and-wallets': 'Torby i portfele', 'category.tassen-en-portemonnees': 'Torby i portfele' },
  ru: { 'category.bags-and-wallets': 'Сумки и кошельки', 'category.tassen-en-portemonnees': 'Сумки и кошельки' },
  tr: { 'category.bags-and-wallets': 'Çantalar ve cüzdanlar', 'category.tassen-en-portemonnees': 'Çantalar ve cüzdanlar' },
  ja: { 'category.bags-and-wallets': 'バッグと財布', 'category.tassen-en-portemonnees': 'バッグと財布' },
  zh: { 'category.bags-and-wallets': '包和钱包', 'category.tassen-en-portemonnees': '包和钱包' },
  ar: { 'category.bags-and-wallets': 'حقائب ومحافظ', 'category.tassen-en-portemonnees': 'حقائب ومحافظ' },
  gr: { 'category.bags-and-wallets': 'Τσάντες και πορτοφόλια', 'category.tassen-en-portemonnees': 'Τσάντες και πορτοφόλια' },
}

const LOCALE_FALLBACK = {
  cz: 'de', sk: 'de', hu: 'de', ro: 'de', bg: 'de',
  hr: 'de', sr: 'de', ba: 'de', me: 'de', sq: 'de', mk: 'de', lt: 'de',
  da: 'de', sv: 'de', nb: 'de', fi: 'de', uk: 'ru', he: 'en', ka: 'en', hy: 'en',
  eg: 'ar', at: 'ar', ps: 'ar', ma: 'ar', dz: 'ar', az: 'tr',
}

function resolvePack(locale) {
  const d = PACKS[locale]
  if (d) return { ...EN, ...d }
  const fb = LOCALE_FALLBACK[locale]
  if (fb && PACKS[fb]) return { ...EN, ...PACKS[fb] }
  return EN
}

let out = "import type { Locale } from '@/lib/i18n-locale-registry'\n\n"
out += 'const EN = ' + JSON.stringify(EN) + '\n\n'
out += 'const BY_LOCALE: Partial<Record<Locale, typeof EN>> = {\n'
for (const loc of LOCALES) {
  out += `  ${loc}: ${JSON.stringify(resolvePack(loc))},\n`
}
out += '}\n\nexport function getCategoryExtraMessages(locale: Locale): typeof EN {\n  return BY_LOCALE[locale] ?? EN\n}\n'

writeFileSync('src/lib/i18n-category-extra.ts', out)
console.log('Generated i18n-category-extra.ts')
